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
