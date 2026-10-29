"use client";

import { FormEvent, useEffect, useState } from "react";
import type { WorkflowResult } from "@/lib/workflow";

const sample = {
  sourceUrl: "https://example.kr/reviews/83920",
  authorHandle: "beauty_user_92",
  clinicRaw: "제이케이 성형외과",
  procedureHint: "쌍꺼풀",
  surgeonHint: "",
  reviewKo: "상담할 때 설명을 자세히 해주셨어요. 수술 후 붓기는 일주일 정도 갔고 지금은 자연스러워서 만족합니다. 대기 시간이 조금 길었어요.",
};

function Icon({ kind }: { kind: "check" | "arrow" | "spark" | "shield" | "quote" }) {
  const paths = {
    check: <path d="m4 10 4 4 8-9" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    spark: <path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z" />,
    shield: <path d="M12 3 5.5 5.7v5.1c0 4.1 2.7 7.7 6.5 9.2 3.8-1.5 6.5-5.1 6.5-9.2V5.7L12 3Zm-3 8.5 2 2 4-4" />,
    quote: <path d="M7.5 10H4a4 4 0 0 1 4-4v6.5A3.5 3.5 0 0 1 4.5 16H4m12-6h-3.5a4 4 0 0 1 4-4v6.5A3.5 3.5 0 0 1 13 16h-.5" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

export default function Home() {
  const [form, setForm] = useState(sample);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runWorkflow() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runWorkflow();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !loading) {
        event.preventDefault();
        void runWorkflow();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main>
      <nav aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Review Relay home">
          <span className="brand-mark">RR</span>
          <span className="brand-copy"><strong>Review Relay</strong><small>Gangnam Beauty Guide</small></span>
        </a>
        <div className="nav-meta"><span>Prototype 01</span><span className="live"><i /> System ready</span></div>
      </nav>

      <header id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>01</span> Auditable review intelligence</div>
          <h1>Local voices,<br /><em>made legible.</em></h1>
          <p className="lede">A source-preserving workflow that translates Korean clinic reviews, resolves who and what they describe, and surfaces uncertainty before a medical-tourism buyer reads them.</p>
          <div className="flowline" aria-label="Workflow: Linguist, Resolver, Trust gate">
            <span><b>01</b> Linguist</span><Icon kind="arrow" /><span><b>02</b> Resolver</span><Icon kind="arrow" /><span><b>03</b> Trust gate</span>
          </div>
        </div>
        <aside className="hero-note">
          <div className="seal"><Icon kind="shield" /><span>Source<br />preserved</span></div>
          <p>“Trust is not a score alone. It is a trail a human can inspect.”</p>
          <small>DESIGN PRINCIPLE / 001</small>
        </aside>
      </header>

      <section className="trust-strip" aria-label="Workflow qualities">
        <p><strong>3</strong><span>specialist agents</span></p>
        <p><strong>100%</strong><span>visible handoffs</span></p>
        <p><strong>0</strong><span>silent guesses</span></p>
        <p><strong>1</strong><span>human review gate</span></p>
      </section>

      <section className="workspace-intro">
        <div><span className="section-no">02</span><p>Live prototype</p></div>
        <h2>From source material<br />to a <em>defensible record.</em></h2>
        <p>Try the sample Korean review or replace it with your own source material. Every decision remains inspectable.</p>
      </section>

      <section className="workbench">
        <form onSubmit={submit}>
          <div className="panel-head">
            <div><small>INPUT / SOURCE</small><h2>Original review</h2></div>
            <span className="pill">한국어 · Korean</span>
          </div>
          <label>Source URL<input type="url" required value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></label>
          <div className="pair">
            <label>Author handle<input required value={form.authorHandle} onChange={(e) => setForm({ ...form, authorHandle: e.target.value })} /></label>
            <label>Clinic as written<input required value={form.clinicRaw} onChange={(e) => setForm({ ...form, clinicRaw: e.target.value })} /></label>
          </div>
          <div className="pair">
            <label>Procedure hint<input value={form.procedureHint} onChange={(e) => setForm({ ...form, procedureHint: e.target.value })} /></label>
            <label>Surgeon, if stated<input placeholder="Not provided" value={form.surgeonHint} onChange={(e) => setForm({ ...form, surgeonHint: e.target.value })} /></label>
          </div>
          <label>Original review<textarea required rows={7} value={form.reviewKo} onChange={(e) => setForm({ ...form, reviewKo: e.target.value })} /></label>
          <button disabled={loading}>
            <span className="button-icon"><Icon kind="spark" /></span>
            {loading ? "Agents are working…" : "Run review relay"}
            <kbd>⌘ ↵</kbd>
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>

        <div className="output" aria-live="polite" aria-busy={loading}>
          <div className="panel-head">
            <div><small>OUTPUT / PUBLICATION</small><h2>Trust record</h2></div>
            {result ? <span className={`pill ${result.status}`}>{result.status.replace("_", " ")}</span> : <span className="pill pending">Awaiting run</span>}
          </div>
          {!result ? (
            <div className="empty">
              <div className="empty-orbit"><span><Icon kind="spark" /></span></div>
              <h3>The record begins here.</h3>
              <p>Run the source review to see its normalized identity, trust decision, and complete agent trace.</p>
            </div>
          ) : (
            <>
              <div className="score-row">
                <div className="score"><strong>{result.review.trust.score}</strong><span>/100<br />trust score</span></div>
                <div className="run-id"><small>RUN ID</small><code>{result.runId}</code></div>
              </div>
              <article className="review-card">
                <div><small>VERIFIED ENTITY MATCH</small><h3>{result.review.clinic.canonicalName}</h3><p>{result.review.procedure} · {result.review.surgeon ?? "Surgeon unverified"}</p></div>
                <span>{Math.round(result.review.clinic.confidence * 100)}% match</span>
              </article>
              <blockquote><Icon kind="quote" />{result.review.reviewEn}</blockquote>
              <div className="signals">
                <small>WHY THIS DECISION</small>
                {result.review.trust.signals.map((item) => <p key={item}><span className="ok"><Icon kind="check" /></span>{item}</p>)}
                {result.review.trust.flags.map((item) => <p key={item}><span className="warn">!</span>{item}</p>)}
              </div>
            </>
          )}
        </div>
      </section>

      {result && (
        <section className="trace">
          <div className="section-title"><div><span className="section-no">03</span><small>EXECUTION TRACE</small></div><h2>Every handoff,<br /><em>visible.</em></h2><p>No opaque “AI magic.” Each specialist has one job, one typed output, and a status a human can challenge.</p></div>
          <div className="trace-grid">{result.trace.map((step, index) => (
            <article key={step.agent}>
              <div className="agent-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={step.status} /><small>{step.status}</small></div>
              <p className="agent-label">AGENT</p><h3>{step.agent.split("·")[1]}</h3><p>{step.purpose}</p>
              <details><summary>Inspect typed output <Icon kind="arrow" /></summary><pre>{JSON.stringify(step.output, null, 2)}</pre></details>
            </article>
          ))}</div>
        </section>
      )}

      <footer><div className="footer-brand"><span className="brand-mark">RR</span><p><strong>Review Relay</strong><br />Built for Gangnam Beauty Guide</p></div><p>Source-preserving<br />Deterministic gates<br />Human escalation</p><p className="footer-note">A working prototype for safer<br />cross-language medical discovery.</p></footer>
    </main>
  );
}
