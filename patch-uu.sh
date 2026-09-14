#!/usr/bin/env bash
# ==============================================================================
# TS-Skipper - Usenet Ultimate UU_BASE_URL Auto-Patcher for Apple ATS
# Repository: https://github.com/ReyesPascal/TS-Skipper
# One-Line Auto-Patch Command:
#   curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/patch-uu.sh | bash
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "⚡ TS-Skipper: Usenet Ultimate UU_BASE_URL Auto-Patcher"
echo "Repository: https://github.com/ReyesPascal/TS-Skipper"
echo "=========================================================="

GATEWAY_PORT="8443"

# 1. Detect LAN IP
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
    LAN_IP="192.168.4.40"
fi
DASHED_IP=$(echo "$LAN_IP" | tr '.' '-')
DOMAIN="${DASHED_IP}.sslip.io"
NEW_BASE_URL="https://${DOMAIN}:${GATEWAY_PORT}"

echo "🔍 Detected Host IP:   $LAN_IP"
echo "🔒 Target Gateway URL: $NEW_BASE_URL"
echo ""

# 2. Locate Usenet Ultimate directory
UU_DIR="${HOME}/usenet-ultimate"

if [ ! -d "$UU_DIR" ] && [ -d "/home/ryan/usenet-ultimate" ]; then
    UU_DIR="/home/ryan/usenet-ultimate"
fi

if [ ! -d "$UU_DIR" ]; then
    echo "⚠️  Could not find Usenet Ultimate at standard path (~/usenet-ultimate)."
    if [ -t 0 ]; then
        read -r -p "Enter path to your usenet-ultimate directory: " USER_INPUT_DIR
        if [ -n "$USER_INPUT_DIR" ]; then
            UU_DIR="${USER_INPUT_DIR/#\~/$HOME}"
        fi
    fi
fi

if [ ! -d "$UU_DIR" ]; then
    echo "❌ Error: Could not locate usenet-ultimate folder."
    echo "💡 You can manually set this in your .env file:"
    echo "   UU_BASE_URL=${NEW_BASE_URL}"
    echo "   NZBDAV_PROXY_ENABLED=true"
    exit 1
fi

echo "📁 Usenet Ultimate Path: $UU_DIR"
UU_ENV="$UU_DIR/.env"

# 3. Update or Create .env
if [ -f "$UU_ENV" ]; then
    echo "📄 Found existing .env at: $UU_ENV"
    # Backup current .env
    cp "$UU_ENV" "${UU_ENV}.bak.$(date +%s)"
    
    if grep -q "UU_BASE_URL=" "$UU_ENV"; then
        OLD_URL=$(grep "UU_BASE_URL=" "$UU_ENV" | head -n1)
        sed -i "s|UU_BASE_URL=.*|UU_BASE_URL=${NEW_BASE_URL}|g" "$UU_ENV"
        echo "   Previous: $OLD_URL"
        echo "   Updated:  UU_BASE_URL=${NEW_BASE_URL}"
    else
        echo "UU_BASE_URL=${NEW_BASE_URL}" >> "$UU_ENV"
        echo "   Added:    UU_BASE_URL=${NEW_BASE_URL}"
    fi

    if ! grep -q "NZBDAV_PROXY_ENABLED=" "$UU_ENV"; then
        echo "NZBDAV_PROXY_ENABLED=true" >> "$UU_ENV"
        echo "   Added:    NZBDAV_PROXY_ENABLED=true"
    fi
else
    echo "📄 Creating new .env file at: $UU_ENV"
    cat <<EOF > "$UU_ENV"
# Configured by TS-Skipper Auto-Patcher
UU_BASE_URL=${NEW_BASE_URL}
NZBDAV_PROXY_ENABLED=true
NZBDAV_NETWORK=existing_nzbdav_network
EOF
fi

echo "✅ Successfully patched $UU_ENV"

# 4. Restart Usenet Ultimate container
if [ -f "$UU_DIR/docker-compose.yml" ]; then
    echo ""
    echo "🔄 Reloading usenet-ultimate container with new TLS base URL..."
    (cd "$UU_DIR" && docker compose up -d usenet-ultimate || docker compose restart usenet-ultimate || true)
    echo "✅ Usenet Ultimate reloaded."
fi

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: Usenet Ultimate is now configured with TLS!"
echo "=========================================================="
echo "🔒 UU_BASE_URL: $NEW_BASE_URL"
echo "📺 Stremio Manifest: $NEW_BASE_URL/manifest.json"
echo ""
echo "🍎 Ready for Apple TV, iOS, and Smart TVs with zero Tailscale needed!"
echo "=========================================================="
