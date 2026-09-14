#!/usr/bin/env bash
# ==============================================================================
# TS-Skipper (Tailscale Skipper) - Automated Ubuntu Installer
# Repository: https://github.com/ReyesPascal/TS-Skipper
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Installing TS-Skipper on Ubuntu"
echo "Repository: https://github.com/ReyesPascal/TS-Skipper"
echo "=========================================================="

# 1. Update system packages
echo "📦 Step 1: Installing system prerequisites..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw git

# 2. Check and install Docker + Compose plugin if missing
if ! command -v docker &> /dev/null; then
    echo "🐳 Step 2: Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed."
fi

# 3. Automatically detect server LAN IP
LAN_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
    LAN_IP="192.168.4.40"
fi
DASHED_IP=$(echo "$LAN_IP" | tr '.' '-')
DOMAIN="${DASHED_IP}.sslip.io"
GATEWAY_PORT=8443
GUI_PORT=3002

echo "🔍 Detected Server IP: $LAN_IP"
echo "🌐 Resolved TLS Domain: $DOMAIN"

# 4. Open UFW firewall ports for gateway and GUI
echo "🛡️ Step 3: Configuring local firewall..."
sudo ufw allow 8443/tcp comment "TS-Skipper HTTPS Gateway"
sudo ufw allow 80/tcp comment "Caddy TLS Verification"
sudo ufw allow 3002/tcp comment "TS-Skipper Local GUI"
sudo ufw status verbose | grep -E "8443|80|3002" || true

# 5. Automatically patch UU_BASE_URL in Usenet Ultimate directory
echo ""
echo "⚙️ Step 4: Automatically configuring Usenet Ultimate for Apple ATS..."
UU_DIR="${HOME}/usenet-ultimate"

if [ ! -d "$UU_DIR" ] && [ -d "/home/ryan/usenet-ultimate" ]; then
    UU_DIR="/home/ryan/usenet-ultimate"
fi

if [ ! -d "$UU_DIR" ]; then
    echo "⚠️  Could not find Usenet Ultimate in default path (~/usenet-ultimate)."
    if [ -t 0 ]; then
        read -r -p "Enter path to your usenet-ultimate folder (or press Enter to skip): " USER_INPUT_DIR
        if [ -n "$USER_INPUT_DIR" ]; then
            # Expand ~ if present
            UU_DIR="${USER_INPUT_DIR/#\~/$HOME}"
        fi
    fi
fi

if [ -d "$UU_DIR" ]; then
    echo "📁 Found Usenet Ultimate directory at: $UU_DIR"
    UU_ENV="$UU_DIR/.env"
    NEW_BASE_URL="https://${DOMAIN}:${GATEWAY_PORT}"

    if [ -f "$UU_ENV" ]; then
        if grep -q "UU_BASE_URL=" "$UU_ENV"; then
            sed -i "s|UU_BASE_URL=.*|UU_BASE_URL=${NEW_BASE_URL}|g" "$UU_ENV"
        else
            echo "UU_BASE_URL=${NEW_BASE_URL}" >> "$UU_ENV"
        fi
        
        if ! grep -q "NZBDAV_PROXY_ENABLED=" "$UU_ENV"; then
            echo "NZBDAV_PROXY_ENABLED=true" >> "$UU_ENV"
        fi
        echo "✅ Updated $UU_ENV with UU_BASE_URL=${NEW_BASE_URL}"
    else
        cat <<EOF > "$UU_ENV"
# Configured by TS-Skipper
UU_BASE_URL=${NEW_BASE_URL}
NZBDAV_PROXY_ENABLED=true
NZBDAV_NETWORK=existing_nzbdav_network
EOF
        echo "✅ Created $UU_ENV with UU_BASE_URL=${NEW_BASE_URL}"
    fi

    # Restart usenet-ultimate if compose file is present
    if [ -f "$UU_DIR/docker-compose.yml" ]; then
        echo "🔄 Reloading usenet-ultimate container with new TLS base URL..."
        (cd "$UU_DIR" && docker compose up -d usenet-ultimate || true)
    fi
else
    echo "ℹ️  Skipping automatic file edit (you can also use the 1-click button in the TS-Skipper GUI at http://localhost:3002)."
fi

# 6. Deploy TS-Skipper in its own dedicated directory (Prevents container name conflicts!)
INSTALL_DIR="${HOME}/TS-Skipper"
echo ""
echo "📦 Step 5: Preparing TS-Skipper service in ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

# Write isolated Caddyfile
cat <<EOF > "${INSTALL_DIR}/Caddyfile"
${DOMAIN}:${GATEWAY_PORT} {
  header {
    Access-Control-Allow-Origin *
    Access-Control-Allow-Methods "GET, POST, OPTIONS, HEAD"
    Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
    Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
  }

  handle /manifest.json {
    reverse_proxy host.docker.internal:1337 {
      header_up Host {upstream_hostport}
    }
  }

  handle /configure* {
    reverse_proxy host.docker.internal:1337
  }

  handle /catalog* {
    reverse_proxy host.docker.internal:1337
  }

  handle /meta* {
    reverse_proxy host.docker.internal:1337
  }

  handle /stream/* {
    reverse_proxy host.docker.internal:3000 {
      header_up Host {upstream_hostport}
    }
  }

  handle /webdav/* {
    reverse_proxy host.docker.internal:3000
  }

  handle {
    reverse_proxy host.docker.internal:1337
  }
}
EOF

# Write isolated docker-compose.yml (PURE Usenet Gateway - NO sab/prowlarr/lidarr!)
cat <<EOF > "${INSTALL_DIR}/docker-compose.yml"
services:
  # Caddy Reverse Proxy (Apple ATS TLS Gateway on port 8443)
  ts-skipper-caddy:
    image: caddy:2-alpine
    container_name: ts-skipper-caddy
    restart: unless-stopped
    ports:
      - "${GATEWAY_PORT}:${GATEWAY_PORT}"
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy_data:/data
      - ./caddy_config:/config
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  caddy_data:
  caddy_config:
EOF

echo "🚀 Starting TS-Skipper Caddy Gateway container..."
docker compose up -d

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: TS-Skipper Gateway is Online!"
echo "=========================================================="
echo "🖥️  Localhost GUI:   http://localhost:${GUI_PORT} (or http://${LAN_IP}:${GUI_PORT})"
echo "🔒 HTTPS Gateway:   https://${DOMAIN}:${GATEWAY_PORT}"
echo "📺 STREMIO MANIFEST URL: https://${DOMAIN}:${GATEWAY_PORT}/manifest.json"
echo ""
echo "📱 WHAT TO PUT INTO STREMIO (Apple TV / iPhone / Smart TV):"
echo "1. On your Apple TV or iPhone, open Stremio."
echo "2. Go to Addons > Search Community Addons."
echo "3. Paste: https://${DOMAIN}:${GATEWAY_PORT}/manifest.json"
echo "4. Click Install — Zero Tailscale needed on any TV or phone!"
echo "=========================================================="
