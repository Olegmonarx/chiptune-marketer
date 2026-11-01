# Self-host на Hetzner (без Cursor Team)

Эта инструкция поднимает `chiptune-marketer` на **вашем** сервере Hetzner.
Cursor Team и `agent-sdk deploy` **не нужны**.

Нужно:
- VPS Hetzner (Ubuntu 22.04/24.04)
- SSH-доступ
- Cursor API key (из аккаунта, за который вы уже платите ~€22)
- Опционально: ключи HeyGen для AI-видео

---

## Что получится

- Агент слушает `127.0.0.1:3000` на сервере
- По будням в 07:00 UTC сам собирает дневной контент-пакет
- Вы можете дергать его с сервера командой `session create` / `curl`
- Состояние (пакеты, work media) хранится в `/var/lib/agent-sdk`

---

## Часть 1. Подключитесь к серверу

С своего компьютера:

```bash
ssh root@IP_ВАШЕГО_СЕРВЕРА
```

(или пользователь с `sudo`, если не root)

---

## Часть 2. Установите Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git
node -v   # должно быть v22.x
```

---

## Часть 3. Скачайте проект

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/Olegmonarx/chiptune-marketer.git
cd chiptune-marketer
npm ci
```

Обновления позже:

```bash
cd /opt/chiptune-marketer
git pull origin main
npm ci
systemctl restart chiptune-marketer
```

---

## Часть 4. Секреты (один раз)

### 4.1. Cursor API key

1. Откройте https://cursor.com/dashboard → API Keys (или Settings → API Keys)
2. Создайте ключ
3. На сервере:

```bash
mkdir -p /etc/chiptune-marketer
nano /etc/chiptune-marketer/env
```

Вставьте (подставьте свои значения):

```bash
CURSOR_API_KEY=ваш_ключ_cursor
AGENT_SDK_BEARER_TOKEN=сгенерируйте_ниже
# Опционально для видео:
# HEYGEN_API_KEY=
# HEYGEN_AVATAR_ID=
# HEYGEN_VOICE_ID=
```

Сгенерировать bearer-токен:

```bash
openssl rand -hex 32
```

Вставьте результат в `AGENT_SDK_BEARER_TOKEN=...`

Права:

```bash
chmod 600 /etc/chiptune-marketer/env
```

---

## Часть 5. systemd-сервис

```bash
cat >/etc/systemd/system/chiptune-marketer.service <<'EOF'
[Unit]
Description=chiptune-marketer Agent SDK
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/chiptune-marketer
EnvironmentFile=/etc/chiptune-marketer/env
ExecStart=/usr/bin/npx --yes @grok/agent-sdk@0.5.0 serve --dir /opt/chiptune-marketer --host 127.0.0.1 --port 3000 --state-root /var/lib/agent-sdk --bearer-token ${AGENT_SDK_BEARER_TOKEN}
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/lib/agent-sdk
systemctl daemon-reload
systemctl enable --now chiptune-marketer
systemctl status chiptune-marketer --no-pager
```

Логи:

```bash
journalctl -u chiptune-marketer -f
```

---

## Часть 6. Проверка

На сервере:

```bash
set -a
source /etc/chiptune-marketer/env
set +a

cd /opt/chiptune-marketer
npx --yes @grok/agent-sdk@0.5.0 session create \
  --slug chiptune-marketer \
  --message "Собери короткий дневной контент-пакет" \
  --wait
```

Или через HTTP (тот же сервер):

```bash
source /etc/chiptune-marketer/env
curl -sS -X POST "http://127.0.0.1:3000/chiptune-marketer/v1/chat" \
  -H "Authorization: Bearer $AGENT_SDK_BEARER_TOKEN" \
  -H "content-type: application/json" \
  -d '{"message":"Собери короткий дневной контент-пакет"}'
```

(Точный chat-путь может отличаться по версии SDK; надёжнее `session create` как выше.)

Расписание `daily-content` (cron `0 7 * * 1-6`, UTC) запускается **в production `serve`**, не в `--dev`.

Ручной запуск расписания (если нужен тест):

```bash
curl -sS -X POST "http://127.0.0.1:3000/chiptune-marketer/v1/dev/schedules/daily-content" \
  -H "Authorization: Bearer $AGENT_SDK_BEARER_TOKEN"
```

(В prod-режиме путь/поведение schedule dispatch смотрите в `agent-sdk docs`; основной автозапуск идёт по cron внутри serve.)

---

## Часть 7. Безопасность (обязательно)

1. **Не открывайте порт 3000 в интернет** без HTTPS и пароля.  
   Сейчас сервис слушает только `127.0.0.1` — так и должно быть.
2. Firewall (если ещё не настроен):

```bash
ufw allow OpenSSH
ufw enable
ufw status
```

3. Если нужен доступ с телефона/дома — сделайте SSH-туннель:

```bash
# на своём ПК:
ssh -L 3000:127.0.0.1:3000 root@IP_СЕРВЕРА
```

Потом открывайте localhost:3000 только через туннель.

4. Не коммитьте `/etc/chiptune-marketer/env` в git.

---

## Часть 8. Фото/видео работ

Когда пришлёте описание работы (или файлы на сервер), в сессии агента скажите зарегистрировать media — tool `register_work_media` сохранит каталог в state-root.

---

## Часть 9. Что дальше по рекламе

Этот self-host **пишет** посты/сценарии и может дергать HeyGen.  
Публикацию в Instagram/TikTok/YouTube пока делаете вы (или подключим Buffer/Meta API отдельно).

---

## Быстрый чеклист

- [ ] Node 22 на Hetzner  
- [ ] `git clone` + `npm ci`  
- [ ] `/etc/chiptune-marketer/env` с `CURSOR_API_KEY` и bearer  
- [ ] `systemctl enable --now chiptune-marketer`  
- [ ] Тест `session create ... --wait`  
- [ ] (опционально) HeyGen-секреты  
