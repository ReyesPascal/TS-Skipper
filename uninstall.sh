#!/usr/bin/env bash
# ==============================================================================
# TS-Skipper - One-Command Ubuntu Uninstaller
# Repository: https://github.com/ReyesPascal/TS-Skipper
# One-Line Uninstall Command:
#   curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/uninstall.sh | bash
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🛑 Uninstalling TS-Skipper (Tailscale Skipper)..."
echo "Repository: https://github.com/ReyesPascal/TS-Skipper"
echo "=========================================================="

INSTALL_DIR="${HOME}/TS-Skipper"
GUI_PORT=3002
GATEWAY_PORT=8443

# 1. Stop and remove Docker containers
if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    echo "🐳 Stopping TS-Skipper Docker containers..."
    (cd "$INSTALL_DIR" && docker compose down -v --remove-orphans || true)
fi

# Double check container removal
if docker ps -a --format '{{.Names}}' | grep -q "^ts-skipper-caddy$"; then
    echo "🧹 Removing container ts-skipper-caddy..."
    docker rm -f ts-skipper-caddy >/dev/null 2>&1 || true
fi

if docker ps -a --format '{{.Names}}' | grep -q "^ts-skipper-gui$"; then
    docker rm -f ts-skipper-gui >/dev/null 2>&1 || true
fi

# 2. Clean up UFW firewall rules
echo "🛡️ Cleaning up UFW firewall rules..."
sudo ufw delete allow ${GATEWAY_PORT}/tcp >/dev/null 2>&1 || true
sudo ufw delete allow ${GUI_PORT}/tcp >/dev/null 2>&1 || true

# 3. Remove TS-Skipper folder
if [ -d "$INSTALL_DIR" ]; then
    echo "🗑️ Removing ${INSTALL_DIR} directory..."
    rm -rf "$INSTALL_DIR"
fi

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: TS-Skipper has been completely uninstalled!"
echo "=========================================================="
echo "✨ Your existing Usenet containers (nzbdav, usenet-ultimate, etc.) are untouched."
echo "💡 To reinstall at any time, run:"
echo "   curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/install.sh | bash"
echo "=========================================================="
