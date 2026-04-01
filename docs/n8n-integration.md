# n8n Integration Points

EchoShare does not depend on n8n for core logic. n8n is used only as a background enhancement layer.

## Outbound app-to-n8n webhook

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

Use this if you want n8n to queue or retry Gemini enrichment asynchronously.

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
   If Gemini fails during inline enrichment, n8n can retry by calling the internal AI route on a schedule or queue.
