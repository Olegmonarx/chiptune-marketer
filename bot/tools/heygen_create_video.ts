import { prompt } from "@grok/agent-sdk";
import type { JsonObject, JsonValue } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

function extractVideoId(raw: JsonValue): string | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  if (typeof raw.video_id === "string") return raw.video_id;
  const data = raw.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (typeof data.video_id === "string") return data.video_id;
  }
  return undefined;
}

export default defineTool({
  description: prompt`
    Create an AI avatar video via HeyGen v3 for a Shorts/Reels script.
    Needs HEYGEN_API_KEY plus avatar_id and voice_id (args or env defaults).
    If secrets are missing, returns a setup checklist instead of calling the API.
  `,
  effect: "write",
  inputSchema: z.object({
    title: z.string().min(2).max(160),
    script: z.string().min(10).max(4000),
    avatarId: z.string().min(2).optional(),
    voiceId: z.string().min(2).optional(),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
    packId: z.string().max(80).optional(),
  }),
  dryRunResult: ({ title }) => ({
    ok: false,
    skipped: true,
    reason: "dry-run",
    title,
    requestedAt: new Date().toISOString(),
  }),
  async execute(input, ctx) {
    const requestedAt = new Date().toISOString();
    const apiKey = process.env.HEYGEN_API_KEY;
    const avatarId = input.avatarId ?? process.env.HEYGEN_AVATAR_ID;
    const voiceId = input.voiceId ?? process.env.HEYGEN_VOICE_ID;
    const setup: string[] = [];
    if (!apiKey) setup.push("Set secret HEYGEN_API_KEY");
    if (!avatarId) {
      setup.push(
        "Set secret HEYGEN_AVATAR_ID (create a photo/avatar in HeyGen first)",
      );
    }
    if (!voiceId) {
      setup.push(
        "Set secret HEYGEN_VOICE_ID (Russian-capable voice preferred)",
      );
    }

    if (!apiKey || !avatarId || !voiceId) {
      return {
        ok: false,
        skipped: true,
        reason: "missing_heygen_config",
        setup,
        requestedAt,
      };
    }

    const body = {
      type: "avatar",
      title: input.title,
      avatar_id: avatarId,
      voice_id: voiceId,
      script: input.script,
      aspect_ratio: input.aspectRatio ?? "9:16",
      output_format: "mp4",
      caption: { file_format: "srt", style: "default" },
    };

    const res = await fetch("https://api.heygen.com/v3/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    let raw: JsonValue = { parseError: true, status: res.status };
    try {
      raw = (await res.json()) as JsonValue;
    } catch {
      // keep parseError shape
    }

    const videoId = extractVideoId(raw);
    const record: JsonObject = {
      ok: res.ok,
      status: res.ok ? "submitted" : "error",
      httpStatus: res.status,
      title: input.title,
      requestedAt,
      raw,
    };
    if (videoId) record.videoId = videoId;
    if (input.packId) record.packId = input.packId;

    if (input.packId) {
      await ctx.host.kv.put(`heygen_job:${input.packId}`, record);
    }
    if (videoId) {
      await ctx.host.kv.put(`heygen_video:${videoId}`, record);
    }

    if (res.ok) {
      return {
        ok: true,
        videoId: videoId ?? null,
        status: "submitted",
        raw,
        requestedAt,
      };
    }

    return {
      ok: false,
      reason: "heygen_http_error",
      setup: [
        "Check HEYGEN_API_KEY, avatar_id, and voice_id in the HeyGen dashboard",
      ],
      videoId: videoId ?? null,
      status: "error",
      raw,
      requestedAt,
    };
  },
});
