# Review Relay — Gangnam Beauty Guide

An inspectable, three-agent workflow for turning a Korean clinic review into a publication-ready English record without hiding uncertainty.

## Agent chain

1. **Linguist** translates supported phrases, extracts procedure/rating claims, retains a source fingerprint, and flags untranslated fragments instead of guessing.
2. **Resolver** normalizes Korean clinic aliases and procedures into stable catalog entities with an explicit confidence score.
3. **Trust Gate** evaluates provenance and required fields, then either publishes the record or routes it to a human-review queue.

Every handoff is returned as structured JSON and shown in the UI. The same input creates the same source fingerprint, making duplicate detection possible downstream.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Run the included checks with `npm test` and create a production bundle with `npm run build`.

## API

`POST /api/workflow` accepts `sourceUrl`, `authorHandle`, `clinicRaw`, `reviewKo`, plus optional `procedureHint` and `surgeonHint`. It returns the normalized record, publish decision, trust signals, flags, and full agent trace.

## Production direction

The demo intentionally uses a small deterministic glossary so it deploys without secrets. In production, the Linguist becomes a schema-constrained model call with Korean/English back-translation checks; the Resolver queries a versioned clinic/surgeon graph; and the Trust Gate checks perceptual hashes, author history, source permissions, and duplicate candidates before writing to a review queue.
