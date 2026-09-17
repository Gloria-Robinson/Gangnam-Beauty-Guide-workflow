import { createHash } from "node:crypto";

export type WorkflowInput = {
  sourceUrl: string;
  authorHandle: string;
  clinicRaw: string;
  reviewKo: string;
  procedureHint?: string;
  surgeonHint?: string;
};

export type TraceStep = {
  agent: string;
  purpose: string;
  status: "passed" | "flagged";
  output: Record<string, unknown>;
};

export type WorkflowResult = {
  runId: string;
  status: "publish" | "human_review";
  review: {
    sourceUrl: string;
    sourceHash: string;
    clinic: { canonicalName: string; slug: string; confidence: number };
    procedure: string;
    surgeon: string | null;
    rating: number | null;
    reviewEn: string;
    trust: { score: number; signals: string[]; flags: string[] };
  };
  trace: TraceStep[];
};

const clinicAliases: Record<string, string> = {
  "제이케이성형외과": "JK Plastic Surgery",
  "제이케이 성형외과": "JK Plastic Surgery",
  "jk성형외과": "JK Plastic Surgery",
  "jk plastic surgery": "JK Plastic Surgery",
};

const procedureAliases: Record<string, string> = {
  "쌍꺼풀": "Double eyelid surgery",
  "눈매교정": "Ptosis correction",
  "코성형": "Rhinoplasty",
  "리프팅": "Face lift",
  "레이저": "Laser treatment",
};

const phraseTranslations: Array<[RegExp, string]> = [
  [/상담할 때 설명을 자세히 해주셨어요/g, "The consultation was explained in detail."],
  [/수술 후 붓기는 일주일 정도 갔고/g, "Swelling lasted about one week after surgery,"],
  [/지금은 자연스러워서 만족합니다/g, "and I am happy with the natural-looking result now."],
  [/대기 시간이 조금 길었어요/g, "The wait was a little long."],
  [/직원들이 친절했어요/g, "The staff were kind."],
  [/가격/g, "price"],
];

function clean(value: string) {
  return value.normalize("NFKC").replace(/[·•|()[\]{}.,_-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function translate(reviewKo: string) {
  let translated = reviewKo;
  for (const [pattern, replacement] of phraseTranslations) translated = translated.replace(pattern, replacement);
  if (/[가-힣]/.test(translated)) {
    translated = `${translated} [Untranslated fragments retained for human review]`;
  }
  return translated.replace(/([.!?])\1+/g, "$1").replace(/\s+/g, " ").trim();
}

function detectProcedure(input: WorkflowInput) {
  const haystack = `${input.procedureHint ?? ""} ${input.reviewKo}`;
  const match = Object.entries(procedureAliases).find(([alias]) => haystack.includes(alias));
  return match?.[1] ?? input.procedureHint?.trim() ?? "Unclassified procedure";
}

function detectRating(reviewKo: string) {
  const numeric = reviewKo.match(/(?:별점|평점)\s*[:：]?\s*([1-5](?:\.\d)?)/);
  if (numeric) return Number(numeric[1]);
  if (/만족|추천|좋았/.test(reviewKo)) return 4;
  return null;
}

export function runWorkflow(input: WorkflowInput): WorkflowResult {
  const required = [input.sourceUrl, input.authorHandle, input.clinicRaw, input.reviewKo];
  if (required.some((value) => !value?.trim())) throw new Error("Source URL, author, clinic and review are required.");
  if (!/^https?:\/\//.test(input.sourceUrl)) throw new Error("Source URL must begin with http:// or https://.");

  const sourceHash = createHash("sha256").update(`${input.sourceUrl}|${input.authorHandle}|${clean(input.reviewKo)}`).digest("hex").slice(0, 16);
  const reviewEn = translate(input.reviewKo);
  const procedure = detectProcedure(input);
  const rating = detectRating(input.reviewKo);
  const trace: TraceStep[] = [];

  trace.push({
    agent: "01 · Linguist",
    purpose: "Extract claims and translate without inventing medical facts",
    status: /\[Untranslated/.test(reviewEn) ? "flagged" : "passed",
    output: { reviewEn, procedure, rating, sourceHash },
  });

  const normalized = clean(input.clinicRaw);
  const resolvedClinic = clinicAliases[normalized];
  const canonicalName = resolvedClinic ?? input.clinicRaw.trim();
  const clinicConfidence = resolvedClinic ? 0.98 : 0.55;
  const clinicHash = createHash("sha256").update(normalized).digest("hex").slice(0, 8);
  const clinicSlug = resolvedClinic ? slugify(canonicalName) : `unresolved-clinic-${clinicHash}`;
  trace.push({
    agent: "02 · Resolver",
    purpose: "Resolve clinic and procedure aliases to stable catalog entities",
    status: clinicConfidence >= 0.8 ? "passed" : "flagged",
    output: { rawClinic: input.clinicRaw, canonicalName, confidence: clinicConfidence, procedure },
  });

  const flags: string[] = [];
  const signals: string[] = ["Source URL retained", "Content fingerprinted"];
  if (clinicConfidence < 0.8) flags.push("Clinic match needs human confirmation");
  if (/\[Untranslated/.test(reviewEn)) flags.push("Translation contains unresolved Korean text");
  if (!input.surgeonHint?.trim()) flags.push("Surgeon not verified");
  else signals.push("Surgeon named in source metadata");
  if (procedure === "Unclassified procedure") flags.push("Procedure not resolved");
  else signals.push("Procedure resolved to controlled vocabulary");
  const trustScore = Math.max(0, Math.min(100, 90 - flags.length * 18));
  const status = flags.length > 0 ? "human_review" : "publish";

  trace.push({
    agent: "03 · Trust Gate",
    purpose: "Score provenance and block uncertain records before publication",
    status: status === "publish" ? "passed" : "flagged",
    output: { trustScore, signals, flags, decision: status },
  });

  return {
    runId: `GBG-${sourceHash.slice(0, 8).toUpperCase()}`,
    status,
    review: {
      sourceUrl: input.sourceUrl,
      sourceHash,
      clinic: { canonicalName, slug: clinicSlug, confidence: clinicConfidence },
      procedure,
      surgeon: input.surgeonHint?.trim() || null,
      rating,
      reviewEn,
      trust: { score: trustScore, signals, flags },
    },
    trace,
  };
}
