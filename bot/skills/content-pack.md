# Daily content pack

Use when the schedule fires or the operator asks for posts / Reels / Shorts.

## Steps

1. Call `market_brief` (focus `daily` unless they named a platform).
2. Call `list_work_media`. If items exist, pick 0–2 that fit today's angle.
3. Draft in Russian:
   - 3 posts for Instagram / TikTok / YouTube Shorts (can share one core hook, adapt length).
   - 1 vertical video script 15–35s: spoken lines, on-screen text, B-roll (prefer registered work media).
4. Call `save_content_pack` with a packId like `YYYY-MM-DD-daily`.
5. If HeyGen ids are available, call `heygen_create_video` with the spoken script and `aspectRatio: "9:16"`.
6. Reply with the pack summary and the saved `packId`.

## Style

- One clear promise per post. No emoji spam. No fake dyno figures.
- CTA: contact for a consult for their car model near 08056.
- Mention legality only as “уточним под ваш авто / TÜV / страховка” — never “ездите без документов”.
