"use client";

import { FormEvent, useState } from "react";
import type { WorkflowResult } from "@/lib/workflow";

const sample = {
  sourceUrl: "https://example.kr/reviews/83920",
  authorHandle: "beauty_user_92",
  clinicRaw: "제이케이 성형외과",
  procedureHint: "쌍꺼풀",
  surgeonHint: "",
  reviewKo: "상담할 때 설명을 자세히 해주셨어요. 수술 후 붓기는 일주일 정도 갔고 지금은 자연스러워서 만족합니다. 대기 시간이 조금 길었어요.",
};

function Mark({ kind }: { kind: "check" | "arrow" | "spark" }) {
  const paths = {
    check: <path d="m4 10 4 4 8-9" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    spark: <path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{paths[kind]}</svg>;
}

export default function Home() {
  const [form, setForm] = useState(sample);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/workflow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Run failed");
    } finally { setLoading(false); }
  }

  return (
    <main>
      <nav><a className="brand" href="#top"><span>GBG</span> Review Relay</a><div className="live"><i /> prototype · v1</div></nav>
      <header id="top">
        <div className="eyebrow">AUDITABLE REVIEW INGESTION</div>
        <h1>Korean reviews in.<br /><em>Trusted context out.</em></h1>
        <p className="lede">A three-agent workflow that translates, resolves, and validates clinic reviews before they reach a medical-tourism buyer.</p>
        <div className="flowline"><span>Linguist</span><Mark kind="arrow" /><span>Resolver</span><Mark kind="arrow" /><span>Trust gate</span></div>
      </header>

      <section className="workbench">
        <form onSubmit={submit}>
          <div className="panel-head"><div><small>INPUT / 01</small><h2>Source review</h2></div><span className="pill">Korean</span></div>
          <label>Source URL<input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></label>
          <div className="pair">
            <label>Author handle<input value={form.authorHandle} onChange={(e) => setForm({ ...form, authorHandle: e.target.value })} /></label>
            <label>Clinic as written<input value={form.clinicRaw} onChange={(e) => setForm({ ...form, clinicRaw: e.target.value })} /></label>
          </div>
          <div className="pair">
            <label>Procedure hint<input value={form.procedureHint} onChange={(e) => setForm({ ...form, procedureHint: e.target.value })} /></label>
            <label>Surgeon, if stated<input placeholder="Not provided" value={form.surgeonHint} onChange={(e) => setForm({ ...form, surgeonHint: e.target.value })} /></label>
          </div>
          <label>Original review<textarea rows={6} value={form.reviewKo} onChange={(e) => setForm({ ...form, reviewKo: e.target.value })} /></label>
          <button disabled={loading}>{loading ? "Running agents…" : <><Mark kind="spark" /> Run workflow <span>⌘ ↵</span></>}</button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>

        <div className="output" aria-live="polite">
          <div className="panel-head"><div><small>OUTPUT / 02</small><h2>Publication record</h2></div>{result && <span className={`pill ${result.status}`}>{result.status.replace("_", " ")}</span>}</div>
          {!result ? <div className="empty"><div><Mark kind="spark" /></div><h3>Ready for a source review</h3><p>The result and complete agent trace will appear here.</p></div> : <>
            <div className="score-row"><div className="score"><strong>{result.review.trust.score}</strong><span>/100<br />trust score</span></div><code>{result.runId}</code></div>
            <article className="review-card"><div><small>NORMALIZED ENTITY</small><h3>{result.review.clinic.canonicalName}</h3><p>{result.review.procedure} · {result.review.surgeon ?? "Surgeon unverified"}</p></div><span>{Math.round(result.review.clinic.confidence * 100)}% match</span></article>
            <blockquote>{result.review.reviewEn}</blockquote>
            <div className="signals">
              {result.review.trust.signals.map((item) => <p key={item}><span className="ok"><Mark kind="check" /></span>{item}</p>)}
              {result.review.trust.flags.map((item) => <p key={item}><span className="warn">!</span>{item}</p>)}
            </div>
          </>}
        </div>
      </section>

      {result && <section className="trace"><div className="section-title"><small>EXECUTION TRACE / 03</small><h2>Every handoff, visible.</h2><p>No opaque “AI magic.” Each agent has one job and a typed output.</p></div><div className="trace-grid">{result.trace.map((step, index) => <article key={step.agent}><div className="agent-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={step.status} /></div><h3>{step.agent.split("·")[1]}</h3><p>{step.purpose}</p><details><summary>Inspect output <Mark kind="arrow" /></summary><pre>{JSON.stringify(step.output, null, 2)}</pre></details></article>)}</div></section>}

      <footer><span>Built for Gangnam Beauty Guide</span><span>Source-preserving · deterministic gates · human escalation</span></footer>
    </main>
  );
}
