import { expr, node, trigger, workflow } from "@n8n/workflow-sdk";

const weeklySchedule = trigger({
  type: "n8n-nodes-base.scheduleTrigger",
  version: 1.3,
  config: {
    name: "Weekly Schedule",
    position: [260, 300],
    parameters: {
      rule: {
        interval: [
          {
            field: "weeks",
            weeksInterval: 1,
            triggerAtDay: [1],
            triggerAtHour: 8,
            triggerAtMinute: 0,
          },
        ],
      },
    },
  },
});

const fetchDigest = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Fetch Weekly Digest",
    position: [580, 300],
    parameters: {
      method: "GET",
      url: expr("={{$env.ECHOSHARE_BASE_URL + '/api/internal/n8n/weekly-digest'}}"),
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

export default workflow(
  "echoshare-weekly-digest",
  "EchoShare weekly digest snapshot",
).add(weeklySchedule).to(fetchDigest);
