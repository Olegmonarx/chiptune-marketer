import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  hosting: {
    // Hosted agent may only call these hosts (plus Cursor platform hosts).
    egressDomains: ["api.heygen.com"],
    // Declare secret names here; set values after deploy with `agent-sdk secret set`.
    secretNames: ["HEYGEN_API_KEY", "HEYGEN_AVATAR_ID", "HEYGEN_VOICE_ID"],
  },
});
