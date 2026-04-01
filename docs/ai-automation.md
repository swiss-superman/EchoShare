# EchoShare AI and Automation Plan

## Current production-safe AI stack

EchoShare uses a real AI pipeline, but it does not require a custom-trained model for the hackathon build.

- `gemini-2.5-flash`
  Used for multimodal report enrichment from report text plus up to three uploaded images.
- `gemini-embedding-001`
  Used to create report embeddings for duplicate-assist and nearby semantic clustering.
- `gemini-2.5-pro`
  Reserved as a heavier review model for future moderator escalation or ambiguous-case review.

The app can override those model choices through environment variables:

```env
GEMINI_REPORT_MODEL=gemini-2.5-flash
GEMINI_REVIEW_MODEL=gemini-2.5-pro
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

## Why there is no custom ML model

For this stage, a custom-trained classifier would add training, evaluation, hosting, and monitoring overhead without improving the product enough for the hackathon timeline.

The better architecture is:

1. Use Gemini for multimodal classification, severity, summary, and action guidance.
2. Use `pgvector` in Postgres for duplicate-assist retrieval.
3. Keep hotspot analytics and dashboard metrics in SQL, not in AI prompts.

That gives a real working AI layer with less operational risk.

## Real AI flow

1. A citizen submits a pollution report.
2. EchoShare stores raw report data, coordinates, and image URLs.
3. The app queues a pending `ReportAIAnalysis` row.
4. A background task or n8n workflow calls the secure internal enrichment route.
5. Gemini returns structured JSON for:
   - summary
   - pollution classification
   - severity estimate
   - waste tags
   - duplicate hints
   - action recommendation
   - moderation notes
6. EchoShare stores that output separately from the original report.
7. The user and moderators can see that the result is AI-assisted, not source truth.

## Duplicate-assist strategy

EchoShare uses a three-stage duplicate check:

1. Geo/time prefilter in Postgres
2. Embedding similarity search in `pgvector`
3. Final Gemini reasoning across the short candidate list

This keeps duplicate detection grounded in data rather than using prompt-only guessing.

## Automation boundaries

n8n is used only as the background enhancement layer.

Use n8n for:

- report-created enrichment handoff
- failed AI retry
- high-severity alerting
- weekly digest generation

Do not move the main app logic into n8n. Report creation, map rendering, dashboard metrics, and community actions must still work even if n8n is down.

## Minimum live wiring

### App environment

```env
N8N_REPORT_CREATED_WEBHOOK_URL=https://your-n8n-instance/webhook/report-created
N8N_HIGH_SEVERITY_WEBHOOK_URL=https://your-n8n-instance/webhook/high-severity
N8N_WEEKLY_DIGEST_WEBHOOK_URL=https://your-n8n-instance/webhook/weekly-digest
N8N_SHARED_SECRET=match-your-internal-routes-secret
```

### n8n environment

```env
ECHOSHARE_BASE_URL=https://your-stable-echoshare-url.vercel.app
ECHOSHARE_INTERNAL_SECRET=match-your-N8N_SHARED_SECRET
```

## Next recommended AI work

1. Add moderator review flows that can optionally escalate difficult reports to `gemini-2.5-pro`.
2. Add confidence scoring and label low-confidence outputs for manual review.
3. Add organization matching so high-severity reports can suggest nearby verified responders.
4. Add digest summaries in n8n using the app's internal weekly digest payload.
