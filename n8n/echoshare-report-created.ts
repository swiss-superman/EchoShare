import { expr, node, trigger, workflow } from "@n8n/workflow-sdk";

const reportCreated = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Report Created",
    position: [260, 300],
    parameters: {
      httpMethod: "POST",
      path: "echoshare/report-created",
      responseMode: "responseNode",
    },
  },
});

const triggerAiEnrichment = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Trigger AI Enrichment",
    position: [580, 300],
    parameters: {
      method: "POST",
      url: expr("={{$env.ECHOSHARE_BASE_URL + '/api/internal/ai/reports/' + $json.body.reportId}}"),
      sendHeaders: true,
      specifyHeaders: "keypair",
      headerParameters: {
        parameters: [
          {
            name: "x-internal-secret",
            value: expr("={{$env.ECHOSHARE_INTERNAL_SECRET}}"),
          },
        ],
      },
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("={{ { analysisId: $json.body.analysisId } }}"),
    },
  },
});

const webhookResponse = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond",
    position: [900, 300],
    parameters: {
      respondWith: "firstIncomingItem",
      options: {
        responseCode: 202,
      },
    },
  },
});

export default workflow(
  "echoshare-report-created",
  "EchoShare report-created enrichment",
).add(reportCreated).to(triggerAiEnrichment.to(webhookResponse));
