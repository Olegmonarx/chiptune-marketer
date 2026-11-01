import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { readItems } from "../lib/kv.js";

export default defineTool({
  description: prompt`
    List registered photos/videos of real chip-tuning jobs.
    Use before drafting posts that should show real workshop proof.
  `,
  effect: "read",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute({ limit }, ctx) {
    const items = readItems(await ctx.host.kv.get("work_media_index"));
    const sorted = [...items].sort((a, b) => {
      const ar = typeof a.registeredAt === "string" ? a.registeredAt : "";
      const br = typeof b.registeredAt === "string" ? b.registeredAt : "";
      return br.localeCompare(ar);
    });
    return {
      count: items.length,
      items: sorted.slice(0, limit ?? 20),
    };
  },
});
