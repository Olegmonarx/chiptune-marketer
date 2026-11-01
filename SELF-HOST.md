# Self-host на Hetzner `49.12.219.253`

Сервер: **только SSH-ключ** (`ssh root@49.12.219.253`).  
Пароли/ключи в чат **не** присылать.

## Не трогать (уже занято)

| Что | Где |
| --- | --- |
| AutoService CRM | `/opt/workshop-crm/app`, systemd `workshop-crm`, `127.0.0.1:8870`, DB `/opt/workshop-crm/data/autoservice.db`, env `/opt/workshop-crm/.env`, public `https://crm.techperformance-kfz.de` |
| Mail timer | `workshop-crm-mail.timer` |
| Finance | `127.0.0.1:8765` + свой Caddy |

Правила этого деплоя:
- код: `/opt/chiptune-marketer/`
- слушать **только** `127.0.0.1:3000` (не 8870/8765, порт наружу не открывать)
- systemd + env: `/etc/chiptune-marketer/env`
- Caddy: **отдельный** site-блок, без правок CRM/finance
- секреты только в env на сервере

---

## Команды деплоя (выполняете вы по SSH)

```bash
ssh root@49.12.219.253
```

Дальше **на сервере** целиком:

```bash
set -euo pipefail

# 1) Node 22, если ещё нет
if ! command -v node >/dev/null || ! node -v | grep -qE 'v22\.|v2[3-9]\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git
node -v

# 2) Код
if [ ! -d /opt/chiptune-marketer/.git ]; then
  git clone https://github.com/Olegmonarx/chiptune-marketer.git /opt/chiptune-marketer
fi
cd /opt/chiptune-marketer
git fetch origin
git checkout main
git reset --hard origin/main
npm ci

# 3) Env (секреты только здесь)
mkdir -p /etc/chiptune-marketer /var/lib/agent-sdk/chiptune-marketer
if [ ! -f /etc/chiptune-marketer/env ]; then
  cat >/etc/chiptune-marketer/env <<EOF
CURSOR_API_KEY=
AGENT_SDK_BEARER_TOKEN=$(openssl rand -hex 32)
# HEYGEN_API_KEY=
# HEYGEN_AVATAR_ID=
# HEYGEN_VOICE_ID=
EOF
  chmod 600 /etc/chiptune-marketer/env
  echo ">>> Заполните CURSOR_API_KEY в /etc/chiptune-marketer/env"
fi

# 4) systemd — только 127.0.0.1:3000
cat >/etc/systemd/system/chiptune-marketer.service <<'EOF'
[Unit]
Description=chiptune-marketer Agent SDK
After=network.target
# Do not touch workshop-crm / finance

[Service]
Type=simple
WorkingDirectory=/opt/chiptune-marketer
EnvironmentFile=/etc/chiptune-marketer/env
ExecStart=/usr/bin/npx --yes @grok/agent-sdk@0.5.0 serve --dir /opt/chiptune-marketer --host 127.0.0.1 --port 3000 --state-root /var/lib/agent-sdk/chiptune-marketer --bearer-token ${AGENT_SDK_BEARER_TOKEN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable chiptune-marketer

# 5) Проверка, что чужие сервисы на месте
systemctl is-active workshop-crm || true
ss -lntp | grep -E ':(8870|8765|3000)\b' || true

echo "Если CURSOR_API_KEY уже в env:"
echo "  systemctl restart chiptune-marketer && systemctl status chiptune-marketer --no-pager"
```

### Обязательно один раз

```bash
nano /etc/chiptune-marketer/env
# вставьте CURSOR_API_KEY=... из https://cursor.com/dashboard (API Keys)
systemctl restart chiptune-marketer
systemctl status chiptune-marketer --no-pager
```

### Тест агента (на сервере)

```bash
set -a; source /etc/chiptune-marketer/env; set +a
cd /opt/chiptune-marketer
npx --yes @grok/agent-sdk@0.5.0 session create \
  --slug chiptune-marketer \
  --message "Собери короткий дневной контент-пакет" \
  --wait
```

Расписание `daily-content` (07:00 UTC, пн–сб) работает при `serve` (не `--dev`).

---

## Опционально: публичный URL через Caddy

Только **новый** site-блок. CRM/finance не редактировать.

Пример (подставьте свой поддомен, DNS → `49.12.219.253`):

```caddy
# /etc/caddy/Caddyfile — ДОБАВИТЬ отдельный блок, не меняя crm/finance
agent.techperformance-kfz.de {
	reverse_proxy 127.0.0.1:3000
}
```

Потом:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Снаружи всё равно нужен bearer (`Authorization: Bearer …` из env).  
Без публичного URL удобнее SSH-туннель с вашего ПК:

```bash
ssh -L 3000:127.0.0.1:3000 root@49.12.219.253
```

---

## Обновление кода

```bash
ssh root@49.12.219.253
cd /opt/chiptune-marketer
git pull origin main
npm ci
systemctl restart chiptune-marketer
# убедиться, что CRM жив:
systemctl is-active workshop-crm
```

---

## Чеклист

- [ ] `/opt/chiptune-marketer` склонирован  
- [ ] `/etc/chiptune-marketer/env` с `CURSOR_API_KEY` (chmod 600)  
- [ ] `chiptune-marketer.service` → `127.0.0.1:3000`  
- [ ] `workshop-crm` active, `:8870` / `:8765` не тронуты  
- [ ] тест `session create --wait`  
- [ ] (опц.) Caddy site-блок отдельно  
