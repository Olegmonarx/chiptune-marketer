# Avatar brief (HeyGen)

Use when `heygen_create_video` returns `missing_heygen_config` or the operator asks how to appear without filming themselves.

## Tell the operator

1. Create a **photo avatar** in HeyGen (or pick a stock avatar if they refuse any likeness).
2. Copy `avatar_id` and a **Russian-capable** `voice_id`.
3. Set secrets on the deployment: `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID`.
4. Re-run the pack or call `heygen_create_video` again.

## Script rules for the avatar

- Spoken Russian, short sentences, 15–35 seconds.
- No claims that the avatar “is” a licensed Meister unless true.
- Point to real workshop B-roll from `list_work_media` for credibility.
