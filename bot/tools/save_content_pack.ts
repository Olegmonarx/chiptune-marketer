import { prompt } from "@grok/agent-sdk";
import type { JsonObject } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { readIds } from "../lib/kv.js";

const postSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube_shorts", "multi"]),
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()).optional(),
});

const videoSchema = z.object({
  durationSec: z.number().int().min(10).max(60),
  spokenScript: z.string(),
  onScreenText: z.array(z.string()),
  brollNotes: z.array(z.string()),
  workMediaIds: z.array(z.string()).optional(),
});

export default defineTool({
  description: prompt`
    Save a finished daily content pack (posts + video script) to durable storage.
    Call once the drafts are ready. Reuse the same packId to overwrite.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    packId: z
      .string()
      .min(3)
      .max(80)
      .describe("Stable id, e.g. 2026-11-01-daily"),
    title: z.string().min(2).max(160),
    posts: z.array(postSchema).min(1).max(6),
    video: videoSchema,
    notes: z.string().max(2000).optional(),
  }),
  async execute(input, ctx) {
    const savedAt = new Date().toISOString();
    const pack: JsonObject = {
      packId: input.packId,
      title: input.title,
      posts: input.posts,
      video: input.video,
      locale: "ru",
      geoPlz: "08056",
      savedAt,
    };
    if (input.notes) pack.notes = input.notes;

    await ctx.host.kv.put(`content_pack:${input.packId}`, pack);
    await ctx.host.files.write(
      `content-packs/${input.packId}.json`,
      JSON.stringify(pack, null, 2),
      { scope: "deployment" },
    );
    const ids = readIds(await ctx.host.kv.get("content_pack_index")).filter(
      (id) => id !== input.packId,
    );
    ids.unshift(input.packId);
    await ctx.host.kv.put("content_pack_index", {
      ids: ids.slice(0, 100),
    });
    return {
      saved: true,
      packId: input.packId,
      savedAt,
      postCount: input.posts.length,
    };
  },
});
