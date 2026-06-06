#!/usr/bin/env bash
# One-time VPS bootstrap for the SaasMint staging environment.
# Run as root: bash bootstrap-vps.sh
set -euo pipefail

SAASMINT_DIR="/opt/saasmint"
DEPLOY_USER="deploy"
GITHUB_ORG="SergiCoder"

echo "==> [1/7] Installing Docker..."
if ! command -v docker &>/dev/null; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
else
    echo "  Docker already installed, skipping."
fi

echo "==> [2/7] Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --system --group --shell /bin/bash --home "/home/$DEPLOY_USER" "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
else
    echo "  User '$DEPLOY_USER' already exists, ensuring docker group."
    usermod -aG docker "$DEPLOY_USER"
fi

echo "==> [3/7] Setting up SSH key for deploy user..."
DEPLOY_SSH_DIR="/home/$DEPLOY_USER/.ssh"
mkdir -p "$DEPLOY_SSH_DIR"
if [ ! -f "$DEPLOY_SSH_DIR/authorized_keys" ] || ! grep -q "deploy@" "$DEPLOY_SSH_DIR/authorized_keys" 2>/dev/null; then
    TMP_KEY="$(mktemp -d)/id_ed25519"
    ssh-keygen -t ed25519 -f "$TMP_KEY" -N "" -C "deploy@$(hostname)" -q
    cat "${TMP_KEY}.pub" >> "$DEPLOY_SSH_DIR/authorized_keys"
    chmod 700 "$DEPLOY_SSH_DIR"
    chmod 600 "$DEPLOY_SSH_DIR/authorized_keys"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_SSH_DIR"
    echo ""
    echo "  ===== PRIVATE KEY (add to GitHub secrets as VPS_SSH_KEY) ====="
    echo "  WARNING: copy the key below NOW — it will be destroyed after this script exits."
    echo "  Do NOT log this output, pipe it to a file, or run this script under 'script'/'tee'."
    echo ""
    cat "$TMP_KEY"
    echo "  ==============================================================="
    echo ""
    # Shred the private key so a later VPS compromise cannot leak it.
    shred -u "$TMP_KEY" "${TMP_KEY}.pub" 2>/dev/null || rm -f "$TMP_KEY" "${TMP_KEY}.pub"
    rmdir "$(dirname "$TMP_KEY")" 2>/dev/null || true
else
    echo "  Deploy SSH key already authorized, skipping."
fi

echo "==> [4/7] Creating $SAASMINT_DIR and cloning the monorepo..."
mkdir -p "$SAASMINT_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$SAASMINT_DIR"

# Clone the monorepo flat into $SAASMINT_DIR — deploy-staging.yml runs
# `cd /opt/saasmint`, so the repo root must BE $SAASMINT_DIR, not a nested
# subdir. Clone as the deploy user so the working tree is deploy-owned and
# `git checkout` during deploys never trips Git's "dubious ownership" guard.
if [ ! -d "$SAASMINT_DIR/.git" ]; then
    sudo -u "$DEPLOY_USER" git clone "https://github.com/$GITHUB_ORG/saasmint.git" "$SAASMINT_DIR"
else
    echo "  Monorepo already cloned, skipping."
fi

echo "==> [5/7] Creating .env.staging from the repo template..."
if [ ! -f "$SAASMINT_DIR/.env.staging" ]; then
    # Seed from the repo's single source of truth so the staging file never
    # drifts from the canonical var set. Edit it for staging afterwards
    # (ENVIRONMENT, real domains, secrets) before the first deploy.
    cp "$SAASMINT_DIR/.env.example" "$SAASMINT_DIR/.env.staging"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$SAASMINT_DIR/.env.staging"
    chmod 600 "$SAASMINT_DIR/.env.staging"
    echo "  Created $SAASMINT_DIR/.env.staging — fill in real values before first deploy."
else
    echo "  .env.staging already exists, skipping."
fi

echo "==> [6/7] Configuring nginx vhosts..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_SRC="$SCRIPT_DIR/../nginx"

for conf in api.saasmint.net.conf app.saasmint.net.conf; do
    cp "$NGINX_SRC/$conf" "/etc/nginx/sites-available/$conf"
    ln -sf "/etc/nginx/sites-available/$conf" "/etc/nginx/sites-enabled/$conf"
    echo "  Installed $conf"
done

nginx -t && systemctl reload nginx
echo "  nginx reloaded."

echo "==> [7/7] Installing certbot..."
if ! command -v certbot &>/dev/null; then
    apt-get install -y certbot python3-certbot-nginx
else
    echo "  certbot already installed, skipping."
fi

echo ""
echo "===== Bootstrap complete ====="
echo ""
echo "Next steps:"
echo "  1. Fill in /opt/saasmint/.env.staging with real credentials"
echo "  2. Run: certbot --nginx -d api.saasmint.net -d app.saasmint.net"
echo "  3. Verify SSH as deploy user works, then disable password auth:"
echo "     Edit /etc/ssh/sshd_config -> PasswordAuthentication no"
echo "     systemctl restart sshd"
echo "  4. Add GitHub secrets to the saasmint repo:"
echo "     VPS_HOST=<your-vps-ip>"
echo "     VPS_PORT=<your-ssh-port>"
echo "     VPS_SSH_KEY=(private key printed above)"
echo "  5. Push a v* tag (e.g. v0.13.1) to trigger the first deploy"
