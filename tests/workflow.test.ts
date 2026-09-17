import assert from "node:assert/strict";
import test from "node:test";
import { runWorkflow } from "../lib/workflow";

const base = {
  sourceUrl: "https://example.kr/review/1",
  authorHandle: "user-1",
  clinicRaw: "제이케이 성형외과",
  procedureHint: "쌍꺼풀",
  surgeonHint: "Dr Kim",
  reviewKo: "상담할 때 설명을 자세히 해주셨어요. 지금은 자연스러워서 만족합니다.",
};

test("runs three inspectable agent handoffs", () => {
  const result = runWorkflow(base);
  assert.equal(result.trace.length, 3);
  assert.deepEqual(result.trace.map((step) => step.agent), ["01 · Linguist", "02 · Resolver", "03 · Trust Gate"]);
});

test("normalizes punctuation and spacing variants to the same clinic", () => {
  const first = runWorkflow(base);
  const variant = runWorkflow({ ...base, clinicRaw: "제이케이·성형외과" });
  assert.equal(first.review.clinic.canonicalName, variant.review.clinic.canonicalName);
  assert.equal(variant.review.clinic.confidence, 0.98);
});

test("routes unresolved entities to human review", () => {
  const result = runWorkflow({ ...base, clinicRaw: "새봄 의원", procedureHint: "", reviewKo: "좋았어요" });
  assert.equal(result.status, "human_review");
  assert.ok(result.review.trust.flags.length >= 2);
});

test("does not duplicate punctuation at translated phrase boundaries", () => {
  const result = runWorkflow(base);
  assert.doesNotMatch(result.review.reviewEn, /\.\./);
});

test("routes every flagged record to human review", () => {
  const result = runWorkflow({ ...base, surgeonHint: "" });
  assert.deepEqual(result.review.trust.flags, ["Surgeon not verified"]);
  assert.equal(result.status, "human_review");
});

test("gives unresolved clinics a stable non-empty fallback slug", () => {
  const first = runWorkflow({ ...base, clinicRaw: "새봄 의원" });
  const second = runWorkflow({
    ...base,
    sourceUrl: "https://another.example/review/99",
    authorHandle: "another-author",
    clinicRaw: "새봄 의원",
    reviewKo: "직원들이 친절했어요.",
  });

  assert.notEqual(first.review.clinic.slug, "");
  assert.equal(first.review.clinic.slug, second.review.clinic.slug);
  assert.match(first.review.clinic.slug, /^unresolved-clinic-[a-f0-9]{8}$/);
  assert.notEqual(first.review.sourceHash, second.review.sourceHash);
});
