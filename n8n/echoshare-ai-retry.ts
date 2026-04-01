import { expr, node, trigger, workflow } from "@n8n/workflow-sdk";

const retrySchedule = trigger({
  type: "n8n-nodes-base.scheduleTrigger",
  version: 1.3,
  config: {
    name: "Retry Schedule",
    position: [260, 300],
    parameters: {
      rule: {
        interval: [
          {
            field: "minutes",
            minutesInterval: 15,
          },
        ],
      },
    },
  },
});

const fetchFailedAnalyses = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Fetch Failed Analyses",
    position: [560, 300],
    parameters: {
      method: "GET",
      url: expr("={{$env.ECHOSHARE_BASE_URL + '/api/internal/ai/reports?status=FAILED&limit=25'}}"),
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
    },
  },
});

const splitFailedAnalyses = node({
  type: "n8n-nodes-base.splitOut",
  version: 1,
  config: {
    name: "Split Failed Analyses",
    position: [860, 300],
    parameters: {
      fieldToSplitOut: "items",
      include: "noOtherFields",
      options: {
        destinationFieldName: "analysis",
      },
    },
  },
});

const retryEnrichment = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Retry Enrichment",
    position: [1160, 300],
    parameters: {
      method: "POST",
      url: expr("={{$env.ECHOSHARE_BASE_URL + '/api/internal/ai/reports/' + $json.analysis.report.id}}"),
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
      jsonBody: expr("={{ { analysisId: $json.analysis.analysisId } }}"),
    },
  },
});

export default workflow(
  "echoshare-ai-retry",
  "EchoShare failed AI retry",
).add(retrySchedule).to(fetchFailedAnalyses.to(splitFailedAnalyses.to(retryEnrichment)));
