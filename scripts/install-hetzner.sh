#!/usr/bin/env bash
# Run on the Hetzner VPS as root after cloning the repo to /opt/chiptune-marketer
#   curl -fsSL ... | bash   OR:  bash scripts/install-hetzner.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/chiptune-marketer}"
ENV_FILE="${ENV_FILE:-/etc/chiptune-marketer/env}"
STATE_ROOT="${STATE_ROOT:-/var/lib/agent-sdk}"
SERVICE_NAME="chiptune-marketer"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (or with sudo)." >&2
  exit 1
fi

if ! command -v node >/dev/null; then
  echo "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs git
fi

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
  echo "Created $ENV_FILE — put your CURSOR_API_KEY there, then:"
  echo "  systemctl restart $SERVICE_NAME"
fi

cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=chiptune-marketer Agent SDK
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/npx --yes @grok/agent-sdk@0.5.0 serve --dir $APP_DIR --host 127.0.0.1 --port 3000 --state-root $STATE_ROOT --bearer-token \${AGENT_SDK_BEARER_TOKEN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

if grep -q '^CURSOR_API_KEY=.\+' "$ENV_FILE"; then
  systemctl restart "$SERVICE_NAME"
  systemctl --no-pager --full status "$SERVICE_NAME" || true
  echo "Service started."
else
  echo "CURSOR_API_KEY is empty in $ENV_FILE — fill it, then: systemctl restart $SERVICE_NAME"
fi
