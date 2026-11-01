#!/usr/bin/env bash
# Safe install on Hetzner host that already runs workshop-crm + finance.
# Does NOT touch /opt/workshop-crm, ports 8870/8765, or existing Caddy sites.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/chiptune-marketer}"
ENV_FILE="${ENV_FILE:-/etc/chiptune-marketer/env}"
STATE_ROOT="${STATE_ROOT:-/var/lib/agent-sdk/chiptune-marketer}"
SERVICE_NAME="chiptune-marketer"
PORT="${PORT:-3000}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

# Refuse colliding ports
if ss -lntp 2>/dev/null | grep -qE ":${PORT}\\b" && ! systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "Port ${PORT} already in use. Set PORT=... to a free localhost port." >&2
  ss -lntp | grep -E ":(${PORT}|8870|8765)\\b" || true
  exit 1
fi

if ! command -v node >/dev/null || ! node -v | grep -qE 'v22\.|v2[3-9]\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git
node -v

mkdir -p "$APP_DIR" "$(dirname "$ENV_FILE")" "$STATE_ROOT"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone https://github.com/Olegmonarx/chiptune-marketer.git "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin
git checkout main
git reset --hard origin/main
npm ci

if [[ ! -f "$ENV_FILE" ]]; then
  TOKEN="$(openssl rand -hex 32)"
  cat >"$ENV_FILE" <<EOF
CURSOR_API_KEY=
AGENT_SDK_BEARER_TOKEN=$TOKEN
# HEYGEN_API_KEY=
# HEYGEN_AVATAR_ID=
# HEYGEN_VOICE_ID=
EOF
  chmod 600 "$ENV_FILE"
fi

cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=chiptune-marketer Agent SDK
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/npx --yes @grok/agent-sdk@0.5.0 serve --dir $APP_DIR --host 127.0.0.1 --port $PORT --state-root $STATE_ROOT --bearer-token \${AGENT_SDK_BEARER_TOKEN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo "--- do-not-touch check ---"
systemctl is-active workshop-crm 2>/dev/null || echo "workshop-crm: (status unknown)"
ss -lntp | grep -E ':(8870|8765|'"$PORT"')\b' || true

if grep -q '^CURSOR_API_KEY=.\+' "$ENV_FILE"; then
  systemctl restart "$SERVICE_NAME"
  systemctl --no-pager --full status "$SERVICE_NAME" || true
else
  echo "Fill CURSOR_API_KEY in $ENV_FILE then: systemctl restart $SERVICE_NAME"
fi
