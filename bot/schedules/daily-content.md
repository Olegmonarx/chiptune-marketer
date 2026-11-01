---
cron: "0 7 * * 1-6"
---

Собери дневной контент-пакет для чиптюнинга (PLZ 08056, Германия).

Следуй skill `content-pack`:
1. `market_brief`
2. `list_work_media`
3. 3 поста на русском + 1 сценарий Reels/TikTok/Shorts
4. `save_content_pack` с packId на сегодняшнюю дату (`YYYY-MM-DD-daily`)
5. При наличии HeyGen — `heygen_create_video`, иначе checklist аватара

Ответ: краткий бриф, посты, сценарий, packId, статус HeyGen.
