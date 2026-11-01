import { prompt } from "@grok/agent-sdk";
import type { JsonObject } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { readItems } from "../lib/kv.js";

export default defineTool({
  description: prompt`
    Register a photo or video of a real chip-tuning job the operator shared.
    Store a catalog entry so later packs can use it as B-roll or proof.
    Pass sourceHint as a workspace path, URL, or short label for the file.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    id: z
      .string()
      .min(3)
      .max(80)
      .describe("Stable id; reuse the same id to update the entry"),
    kind: z.enum(["photo", "video", "other"]),
    title: z.string().min(2).max(120),
    description: z
      .string()
      .min(8)
      .max(2000)
      .describe("What is visible and what work was done"),
    sourceHint: z
      .string()
      .max(500)
      .optional()
      .describe("Path, URL, or label for the media file"),
    car: z.string().max(120).optional(),
    workDone: z.string().max(240).optional(),
  }),
  async execute(input, ctx) {
    const existing = readItems(await ctx.host.kv.get("work_media_index"));
    const registeredAt = new Date().toISOString();
    const item: JsonObject = {
      id: input.id,
      kind: input.kind,
      title: input.title,
      description: input.description,
      registeredAt,
    };
    if (input.sourceHint) item.sourceHint = input.sourceHint;
    if (input.car) item.car = input.car;
    if (input.workDone) item.workDone = input.workDone;

    const next = existing.filter((x) => x.id !== item.id);
    next.push(item);
    await ctx.host.kv.put("work_media_index", { items: next });
    await ctx.host.files.write(
      `work-media/${input.id}.json`,
      JSON.stringify(item, null, 2),
      { scope: "deployment" },
    );
    return {
      registered: true,
      id: input.id,
      total: next.length,
      registeredAt,
    };
  },
});
