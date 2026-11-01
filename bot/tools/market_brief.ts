import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { readItems } from "../lib/kv.js";

export default defineTool({
  description: prompt`
    Seed a fixed niche brief for chip-tuning content near PLZ 08056, Germany.
    Call this before drafting a daily content pack. Does not invent market research.
  `,
  effect: "read",
  inputSchema: z.object({
    focus: z
      .enum(["daily", "reels", "tiktok", "shorts", "proof"])
      .optional()
      .describe("Optional angle hint for the pack"),
  }),
  async execute({ focus }, ctx) {
    const now = new Date();
    const mediaCount = readItems(
      await ctx.host.kv.get("work_media_index"),
    ).length;

    return {
      generatedAt: now.toISOString(),
      locale: "ru",
      geo: {
        country: "Germany",
        plz: "08056",
        area: "Zwickau / Saxony",
        audienceNote:
          "Russian-speaking drivers in eastern Germany; bilingual DE/RU customers possible",
      },
      platforms: ["instagram_reels", "tiktok", "youtube_shorts"],
      service: {
        name: "chip-tuning / Leistungssteigerung",
        angleHints: [
          "measurable power and torque",
          "fuel economy vs sport maps",
          "diagnostics before remap",
          "TÜV / insurance — case-by-case, no illegal promises",
          "real workshop photos as proof when available",
        ],
      },
      focus: focus ?? "daily",
      registeredWorkMediaCount: mediaCount,
      contentRules: [
        "Customer-facing copy in Russian",
        "No fake dyno numbers or fake reviews",
        "CTA: write / call for a free consult for your car model",
      ],
    };
  },
});
