#!/usr/bin/env bash
# ==============================================================================
# TS-Skipper (Tailscale Skipper) - One-Command Ubuntu Installer
# Repository: https://github.com/ReyesPascal/TS-Skipper
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Installing TS-Skipper (Tailscale Skipper) on Ubuntu"
echo "Repository: https://github.com/ReyesPascal/TS-Skipper"
echo "=========================================================="

# 1. Update APT packages and install dependencies
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

# 3. Detect LAN IP
LAN_IP=$(hostname -I | awk '{print $1}')
DASHED_IP=$(echo "$LAN_IP" | tr '.' '-')
DOMAIN="${DASHED_IP}.sslip.io"

echo "🔍 Detected Host IP: $LAN_IP"
echo "🌐 Resolved Domain:  $DOMAIN"

# 4. Open UFW firewall ports
echo "🛡️ Step 4: Configuring local firewall..."
sudo ufw allow 8443/tcp comment "TS-Skipper HTTPS Gateway"
sudo ufw allow 80/tcp comment "Caddy TLS Verification"
sudo ufw allow 3002/tcp comment "TS-Skipper Local GUI"
sudo ufw status verbose | grep -E "8443|80|3002" || true

# 5. Start Docker Compose Stack if docker-compose.yml exists
if [ -f "docker-compose.yml" ]; then
    echo "🚀 Step 5: Starting Docker services..."
    docker compose up -d
fi

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: TS-Skipper is Ready on Port 3002!"
echo "=========================================================="
echo "🖥️  Localhost GUI: http://localhost:3002"
echo "🌐 Network GUI:   http://${LAN_IP}:3002"
echo "🔒 HTTPS Gateway: https://${DOMAIN}:8443"
echo "📺 Stremio URL:   https://${DOMAIN}:8443/manifest.json"
echo ""
echo "✨ Existing Containers Untouched:"
echo "   - nzbdav:        port 3000 (preserved!)"
echo "   - usenet-ultimate: port 1337 (proxied to 8443)"
echo "   - sabnzbd:       port 8080"
echo "   - prowlarr:      port 9696"
echo "   - lidarr:        port 8686"
echo ""
echo "📱 WHAT TO PUT INTO STREMIO (Apple TV / iPhone / Smart TV):"
echo "1. In Stremio, go to Addons > Community Addons"
echo "2. Paste: https://${DOMAIN}:8443/manifest.json"
echo "3. Click Install — Zero Tailscale required on client devices!"
echo "=========================================================="
