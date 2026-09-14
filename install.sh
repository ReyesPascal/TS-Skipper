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

# Write isolated Caddyfile (Serves Web GUI on 3002 & TLS Gateway on 8443)
cat <<EOF > "${INSTALL_DIR}/Caddyfile"
# TS-Skipper Web GUI on port ${GUI_PORT}
:${GUI_PORT} {
  root * /var/www/ts-skipper
  file_server
  try_files {path} /index.html
}

# TS-Skipper HTTPS Gateway on port ${GATEWAY_PORT} (Apple ATS Compliant)
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

# Create www directory for GUI Dashboard
mkdir -p "${INSTALL_DIR}/www"
cat <<'EOF' > "${INSTALL_DIR}/www/index.html"
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TS-Skipper Gateway Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-8">
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-600/30">
          ⚡
        </div>
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            TS-Skipper Gateway
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">v2.1 Online</span>
          </h1>
          <p class="text-xs text-slate-400">Zero-Tailscale Usenet TLS Gateway for Apple TV & Stremio</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono" id="server-host">
          Detecting Host...
        </span>
      </div>
    </header>

    <!-- Stremio Manifest Hero Box -->
    <div class="p-6 bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-800/50 rounded-2xl space-y-4 shadow-xl">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono">Ready for Apple TV / iOS / PC</span>
          <h2 class="text-base font-bold text-white">Your Stremio Addon Manifest URL</h2>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 font-semibold flex items-center gap-1">
          ✓ Apple ATS Compliant
        </span>
      </div>

      <div class="relative group">
        <input 
          type="text" 
          id="manifest-url-input" 
          readonly 
          class="w-full bg-slate-950 border border-purple-800/60 rounded-xl p-3.5 pr-28 text-sm font-mono text-purple-200 select-all focus:outline-none focus:border-purple-400"
          value=""
        />
        <button 
          onclick="copyManifestUrl()" 
          id="copy-btn"
          class="absolute top-2 right-2 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <span>Copy URL</span>
        </button>
      </div>

      <div class="flex flex-wrap gap-2.5 pt-1">
        <a id="test-manifest-link" href="#" target="_blank" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-2">
          <span>Test Manifest in Browser ↗</span>
        </a>
        <a id="stremio-deeplink" href="#" class="px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/60 border border-purple-700/50 text-xs font-medium text-purple-200 transition-colors flex items-center gap-2">
          <span>1-Click Open in Stremio 📺</span>
        </a>
      </div>
    </div>

    <!-- Live Port Status Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span class="text-[11px] text-slate-400 block font-mono">Web GUI</span>
        <span class="text-sm font-bold text-cyan-400 font-mono">:3002</span>
        <span class="text-[10px] text-emerald-400 block mt-1">● Active</span>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span class="text-[11px] text-slate-400 block font-mono">TLS Gateway</span>
        <span class="text-sm font-bold text-emerald-400 font-mono">:8443</span>
        <span class="text-[10px] text-emerald-400 block mt-1">● HTTPS / ATS</span>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span class="text-[11px] text-slate-400 block font-mono">Usenet Ultimate</span>
        <span class="text-sm font-bold text-purple-400 font-mono">:1337</span>
        <span class="text-[10px] text-purple-400 block mt-1">● Bridged</span>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span class="text-[11px] text-slate-400 block font-mono">NZB-DAV</span>
        <span class="text-sm font-bold text-indigo-400 font-mono">:3000</span>
        <span class="text-[10px] text-indigo-400 block mt-1">● WebDAV Stream</span>
      </div>
    </div>

    <!-- Quick Instructions -->
    <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
      <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <span>📖 How to Install on Stremio</span>
      </h3>
      <ol class="space-y-3 text-xs text-slate-300">
        <li class="flex items-start gap-3">
          <span class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
          <div>Open <strong class="text-white">Stremio</strong> on your Apple TV, iPhone, iPad, Smart TV, or PC.</div>
        </li>
        <li class="flex items-start gap-3">
          <span class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
          <div>Navigate to <strong class="text-white">Addons</strong> &gt; click the search/bar or <strong class="text-white">Community Addons</strong>.</div>
        </li>
        <li class="flex items-start gap-3">
          <span class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
          <div>Paste your manifest URL (<code class="text-purple-300" id="instruction-url"></code>) and hit <strong class="text-white">Install</strong>.</div>
        </li>
      </ol>
    </div>

    <!-- Usenet Ultimate Auto-Patcher Box -->
    <div class="p-6 bg-slate-900 border border-indigo-900/50 rounded-2xl space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚡</span>
          <div>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Auto-Configure Usenet Ultimate (UU_BASE_URL)</h3>
            <p class="text-xs text-slate-400 mt-0.5">Required so Stremio on Apple TV / iPhone gets HTTPS stream URLs that pass Apple ATS without Tailscale.</p>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Apple ATS Required</span>
      </div>

      <div class="space-y-3">
        <div>
          <span class="text-[11px] text-purple-300 font-semibold block mb-1">1-Command Terminal Auto-Patcher:</span>
          <div class="relative">
            <pre id="patch-cmd-box" class="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-purple-300 font-mono select-all overflow-x-auto pr-24">curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/patch-uu.sh | bash</pre>
            <button onclick="copyPatchCmd()" id="copy-patch-btn" class="absolute top-2 right-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all">Copy</button>
          </div>
        </div>

        <div>
          <span class="text-[11px] text-slate-400 font-semibold block mb-1">Target Setting in ~/usenet-ultimate/.env:</span>
          <pre id="env-preview" class="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono select-all">UU_BASE_URL=https://192-168-4-40.sslip.io:8443
NZBDAV_PROXY_ENABLED=true</pre>
        </div>
      </div>
    </div>

    <!-- Command Tools: Install & Uninstall -->
    <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
      <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <span>⚙️ Quick Terminal Commands</span>
      </h3>
      
      <div class="space-y-3">
        <div>
          <label class="text-[11px] text-slate-400 font-medium block mb-1">One-Line Update / Reinstall:</label>
          <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-purple-300 select-all">
            curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/install.sh | bash
          </div>
        </div>

        <div>
          <label class="text-[11px] text-cyan-400 font-medium block mb-1">One-Line Usenet Ultimate Auto-Patcher:</label>
          <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 select-all">
            curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/patch-uu.sh | bash
          </div>
        </div>

        <div>
          <label class="text-[11px] text-rose-400 font-medium block mb-1">One-Line Complete Uninstall:</label>
          <div class="p-2.5 bg-slate-950 border border-rose-950/60 rounded-xl text-xs font-mono text-rose-300 select-all">
            curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/uninstall.sh | bash
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const host = window.location.hostname;
    const dashedIp = host.replace(/\./g, '-');
    const domain = (host === 'localhost' || host === '127.0.0.1') ? '192-168-4-40.sslip.io' : `${dashedIp}.sslip.io`;
    const manifestUrl = `https://${domain}:8443/manifest.json`;

    document.getElementById('server-host').innerText = `Host: ${host}`;
    document.getElementById('manifest-url-input').value = manifestUrl;
    document.getElementById('instruction-url').innerText = manifestUrl;
    document.getElementById('test-manifest-link').href = manifestUrl;
    document.getElementById('stremio-deeplink').href = manifestUrl.replace('https://', 'stremio://');

    function copyManifestUrl() {
      const input = document.getElementById('manifest-url-input');
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('copy-btn');
      btn.innerHTML = '<span>✓ Copied!</span>';
      setTimeout(() => {
        btn.innerHTML = '<span>Copy URL</span>';
      }, 2000);
    }

    function copyPatchCmd() {
      const cmd = document.getElementById('patch-cmd-box').innerText;
      navigator.clipboard.writeText(cmd);
      const btn = document.getElementById('copy-patch-btn');
      btn.innerText = '✓ Copied!';
      setTimeout(() => {
        btn.innerText = 'Copy';
      }, 2000);
    }
  </script>
</body>
</html>
EOF

# Write local Usenet Ultimate auto-patch script
cat <<'EOF' > "${INSTALL_DIR}/patch-uu.sh"
#!/usr/bin/env bash
set -euo pipefail

GATEWAY_PORT="8443"
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
    LAN_IP="192.168.4.40"
fi
DASHED_IP=$(echo "$LAN_IP" | tr '.' '-')
DOMAIN="${DASHED_IP}.sslip.io"
NEW_BASE_URL="https://${DOMAIN}:${GATEWAY_PORT}"

echo "=========================================================="
echo "⚡ Auto-Updating Usenet Ultimate UU_BASE_URL"
echo "Target Base URL: $NEW_BASE_URL"
echo "=========================================================="

UU_DIR="${HOME}/usenet-ultimate"
if [ ! -d "$UU_DIR" ] && [ -d "/home/ryan/usenet-ultimate" ]; then
    UU_DIR="/home/ryan/usenet-ultimate"
fi

if [ ! -d "$UU_DIR" ]; then
    echo "⚠️  ~/usenet-ultimate not found. Checking custom directory..."
    if [ -t 0 ]; then
        read -r -p "Enter path to usenet-ultimate folder: " USER_DIR
        if [ -n "$USER_DIR" ]; then
            UU_DIR="${USER_DIR/#\~/$HOME}"
        fi
    fi
fi

if [ ! -d "$UU_DIR" ]; then
    echo "❌ Could not find usenet-ultimate folder. Set UU_BASE_URL=$NEW_BASE_URL manually in your .env"
    exit 1
fi

UU_ENV="$UU_DIR/.env"
if [ -f "$UU_ENV" ]; then
    if grep -q "UU_BASE_URL=" "$UU_ENV"; then
        sed -i "s|UU_BASE_URL=.*|UU_BASE_URL=${NEW_BASE_URL}|g" "$UU_ENV"
    else
        echo "UU_BASE_URL=${NEW_BASE_URL}" >> "$UU_ENV"
    fi
    if ! grep -q "NZBDAV_PROXY_ENABLED=" "$UU_ENV"; then
        echo "NZBDAV_PROXY_ENABLED=true" >> "$UU_ENV"
    fi
    echo "✅ Successfully updated $UU_ENV"
else
    cat <<ENV_EOF > "$UU_ENV"
UU_BASE_URL=${NEW_BASE_URL}
NZBDAV_PROXY_ENABLED=true
NZBDAV_NETWORK=existing_nzbdav_network
ENV_EOF
    echo "✅ Successfully created $UU_ENV"
fi

if [ -f "$UU_DIR/docker-compose.yml" ]; then
    echo "🔄 Reloading usenet-ultimate container..."
    (cd "$UU_DIR" && docker compose up -d usenet-ultimate || true)
fi
echo "🎉 Usenet Ultimate is now configured with TLS for Apple ATS!"
EOF
chmod +x "${INSTALL_DIR}/patch-uu.sh"

# Write local uninstall script
cat <<'EOF' > "${INSTALL_DIR}/uninstall.sh"
#!/usr/bin/env bash
set -euo pipefail
echo "🛑 Stopping and removing TS-Skipper..."
cd "$(dirname "$0")"
docker compose down -v --remove-orphans || true
sudo ufw delete allow 8443/tcp >/dev/null 2>&1 || true
sudo ufw delete allow 3002/tcp >/dev/null 2>&1 || true
TARGET_DIR="$(pwd)"
cd "$HOME"
rm -rf "$TARGET_DIR" 2>/dev/null || sudo rm -rf "$TARGET_DIR" || true
echo "✅ TS-Skipper completely removed. Your Usenet containers are untouched."
EOF
chmod +x "${INSTALL_DIR}/uninstall.sh"

# Write isolated docker-compose.yml (PURE Usenet Gateway + GUI)
cat <<EOF > "${INSTALL_DIR}/docker-compose.yml"
services:
  # Caddy Reverse Proxy & GUI Dashboard
  ts-skipper-caddy:
    image: caddy:2-alpine
    container_name: ts-skipper-caddy
    restart: unless-stopped
    ports:
      - "${GATEWAY_PORT}:${GATEWAY_PORT}"
      - "80:80"
      - "${GUI_PORT}:${GUI_PORT}"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy_data:/data
      - ./caddy_config:/config
      - ./www:/var/www/ts-skipper:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  caddy_data:
  caddy_config:
EOF

echo "🚀 Starting TS-Skipper container (Serving GUI on :${GUI_PORT} & Gateway on :${GATEWAY_PORT})..."
docker compose up -d

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: TS-Skipper Gateway is Online!"
echo "=========================================================="
echo "🖥️  Localhost GUI:       http://localhost:${GUI_PORT} (or http://${LAN_IP}:${GUI_PORT})"
echo "🔒 HTTPS Gateway:       https://${DOMAIN}:${GATEWAY_PORT}"
echo "📺 STREMIO MANIFEST URL: https://${DOMAIN}:${GATEWAY_PORT}/manifest.json"
echo "=========================================================="
echo "🛑 ONE-LINE UNINSTALL:"
echo "   curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/uninstall.sh | bash"
echo "   (or run locally: bash ~/TS-Skipper/uninstall.sh)"
echo "=========================================================="

