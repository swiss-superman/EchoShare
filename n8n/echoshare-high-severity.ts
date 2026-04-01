import { expr, node, trigger, workflow } from "@n8n/workflow-sdk";

const highSeverity = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "High Severity",
    position: [260, 300],
    parameters: {
      httpMethod: "POST",
      path: "echoshare/high-severity",
      responseMode: "responseNode",
    },
  },
});

const fetchFullContext = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Fetch Full Context",
    position: [580, 300],
    parameters: {
      method: "POST",
      url: expr("={{$env.ECHOSHARE_BASE_URL + '/api/internal/n8n/high-severity'}}"),
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
      jsonBody: expr("={{ { reportId: $json.body.reportId } }}"),
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
  "echoshare-high-severity",
  "EchoShare high-severity context intake",
).add(highSeverity).to(fetchFullContext.to(webhookResponse));
