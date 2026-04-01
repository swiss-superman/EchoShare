# n8n Integration Points

EchoShare does not depend on n8n for core logic. n8n is used only as a background enhancement layer.

## n8n environment variables

Set these in your n8n cloud workspace before activating the workflows:

```env
ECHOSHARE_BASE_URL=https://your-stable-echoshare-url.vercel.app
ECHOSHARE_INTERNAL_SECRET=match-your-N8N_SHARED_SECRET
```

## Live wiring checklist

1. Deploy EchoShare to a stable Vercel URL.
2. Set the app webhook env vars in Vercel.
3. Set `ECHOSHARE_BASE_URL` and `ECHOSHARE_INTERNAL_SECRET` in n8n.
4. Activate the n8n workflows only after both sides are configured.
5. Test one real flow end-to-end: create report -> webhook -> internal AI route -> completed `ReportAIAnalysis`.

## Outbound app-to-n8n webhook

### Report-created orchestration

Environment variable:

```env
N8N_REPORT_CREATED_WEBHOOK_URL=https://your-n8n-instance/webhook/report-created
```

Triggered after a report is saved and a pending AI analysis has been queued.

EchoShare treats non-2xx webhook responses as failures, so the app can safely fall back to direct AI enrichment instead of silently assuming n8n accepted the job.

If `N8N_SHARED_SECRET` is set, EchoShare also sends:

```http
x-echoshare-secret: <N8N_SHARED_SECRET>
```

Payload:

```json
{
  "appBaseUrl": "https://your-app.vercel.app",
  "reportId": "clx...",
  "title": "Overflowing plastic waste near the east steps",
  "waterBodyName": "Ulsoor Lake",
  "severity": "MEDIUM",
  "category": "PLASTIC",
  "reportUrl": "/reports/clx...",
  "aiRequested": true
}
```

Suggested workflow:

1. Receive webhook in n8n
2. Immediately call `POST /api/internal/ai/reports/:id`
3. If enrichment fails, keep the analysis ID for scheduled retry

### High-severity alert

Environment variable:

```env
N8N_HIGH_SEVERITY_WEBHOOK_URL=https://your-n8n-instance/webhook/high-severity
```

Triggered when a report is created with `HIGH` or `CRITICAL` user severity.

Payload:

```json
{
  "reportId": "clx...",
  "title": "Overflowing plastic waste near the east steps",
  "waterBodyName": "Demo East Lake",
  "severity": "HIGH",
  "category": "PLASTIC",
  "reportUrl": "/reports/clx..."
}
```

Suggested workflow:

1. Receive webhook in n8n
2. Call `POST /api/internal/n8n/high-severity`
3. Format Slack/email/WhatsApp alert for response stakeholders

## Secure n8n-to-app routes

All internal routes require:

```http
x-internal-secret: <N8N_SHARED_SECRET>
```

### Trigger AI enrichment

`POST /api/internal/ai/reports/:id`

Optional body:

```json
{
  "analysisId": "clx..."
}
```

Use this if you want n8n to queue or retry Gemini enrichment asynchronously.

### List pending or failed AI jobs

`GET /api/internal/ai/reports?status=PENDING&limit=20`

Use this in a scheduled n8n retry workflow to fetch stuck or failed analyses.

### Fetch full high-severity payload

`POST /api/internal/n8n/high-severity`

Body:

```json
{
  "reportId": "clx..."
}
```

### Generate weekly digest payload

`GET /api/internal/n8n/weekly-digest`

Returns summary metrics, participation count, and top water bodies for scheduled digest workflows.

## Recommended n8n workflows

1. High-severity escalation
   Triggered by outbound webhook, enriches context, then sends email/Slack notification.

2. Weekly digest
   Cron trigger in n8n calls the digest endpoint and formats email content for organizers or admin reviewers.

3. Deferred AI retry
   Schedule trigger fetches `GET /api/internal/ai/reports?status=FAILED`, then loops through `POST /api/internal/ai/reports/:id`.
