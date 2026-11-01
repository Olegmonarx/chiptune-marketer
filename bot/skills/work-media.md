# Real work photos and videos

The operator may upload or describe photos/videos of real chip-tuning jobs.

## When they share media

1. Ask only what is missing: car model, what was done, what may be shown publicly.
2. Call `register_work_media` with a stable `id` (e.g. `golf7-stage1-2026-11-01`), `kind`, title, description, optional `sourceHint` (filename or URL they named).
3. Confirm the id and that later packs can reuse it.

## When drafting

1. Call `list_work_media`.
2. Prefer real assets in B-roll notes and captions (“кадр с прошивки …”).
3. Never invent results not present in the description.

## Privacy

If plates, faces of customers, or documents are visible, note that they should be cropped or blurred before public posting.
