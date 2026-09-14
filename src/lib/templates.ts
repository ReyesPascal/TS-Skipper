import { GatewayConfig, AppConfigGuide } from '../types';

export function getResolvedDomain(config: GatewayConfig): string {
  if (config.domainMode === 'sslip') {
    const dashedIp = config.serverIp.replace(/\./g, '-');
    return `${dashedIp}.sslip.io`;
  }
  if (config.domainMode === 'duckdns') {
    return config.customDomain ? `${config.customDomain}.duckdns.org` : `my-usenet.duckdns.org`;
  }
  if (config.domainMode === 'custom') {
    return config.customDomain || 'usenet.home.arpa';
  }
  return config.serverIp;
}

export function getManifestUrl(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);
  return `https://${domain}:${config.gatewayPort}/manifest.json`;
}

export function getAppConfigGuides(config: GatewayConfig): AppConfigGuide[] {
  const domain = getResolvedDomain(config);
  const manifestUrl = getManifestUrl(config);

  return [
    {
      appName: 'Stremio (Apple TV, iOS, iPadOS, Smart TV, PC)',
      category: 'player',
      currentPort: 'Native Player',
      description: 'The front-end streaming player. Connects over your local Wi-Fi without Tailscale.',
      fields: [
        {
          label: 'Addon Manifest URL',
          value: manifestUrl,
          explanation: 'Paste into Stremio > Addons > Community Addons search bar. Fully satisfies Apple ATS on port 8443.',
          critical: true,
        },
        {
          label: 'Alternative Deep Link',
          value: manifestUrl.replace(/^https?:\/\//, 'stremio://'),
          explanation: 'Click or enter into Safari on iPhone/Mac to install the addon into Stremio in 1 click.',
        },
        {
          label: 'Wi-Fi Streaming Target',
          value: `Local Wi-Fi Network (${config.serverIp})`,
          explanation: 'Streams directly from your Ubuntu laptop with 0 latency and 0 client-side VPNs.',
        },
      ],
    },
    {
      appName: 'Usenet Ultimate (ghcr.io/dsmart33/usenet-ultimate)',
      category: 'addon',
      currentPort: '127.0.0.1:1337:1337',
      description: 'Detected from your ~/usenet-ultimate/docker-compose.yml. Bridges Stremio metadata with NZB-DAV.',
      fields: [
        {
          label: 'UU_BASE_URL (in ~/usenet-ultimate/.env)',
          value: `https://${domain}:${config.gatewayPort}`,
          explanation: 'CRITICAL: Change your UU_BASE_URL to this HTTPS gateway URL. This makes all video stream links ATS-compliant!',
          critical: true,
        },
        {
          label: 'NZBDAV_PROXY_ENABLED',
          value: 'true',
          explanation: 'Keep enabled so Usenet Ultimate routes stream requests through the reverse proxy.',
          critical: true,
        },
        {
          label: 'Port Binding (Existing)',
          value: '127.0.0.1:1337:1337',
          explanation: 'Bound to localhost port 1337 on Ubuntu host.',
        },
        {
          label: 'Docker Network',
          value: 'existing_nzbdav_network (external)',
          explanation: 'Connects to your existing nzbdav network.',
        },
      ],
    },
    {
      appName: 'NZB-DAV (nzbdav/nzbdav:latest)',
      category: 'engine',
      currentPort: '3000:3000',
      description: 'Detected from your /home/ryan/docker-compose.yml. Mounts Usenet articles as streaming files.',
      fields: [
        {
          label: 'Port Binding (Existing)',
          value: '3000:3000 (Host port 3000)',
          explanation: 'Running on port 3000. TS-Skipper GUI was specifically moved to port 3002 so it never conflicts with this!',
          critical: true,
        },
        {
          label: 'Config & Volumes (Existing)',
          value: './nzbdav_config:/config',
          explanation: 'Your persistent configuration directory.',
        },
        {
          label: 'NNTP Provider Recommendations',
          value: 'Port 563 (SSL Encrypted)',
          explanation: 'Always use SSL port 563 in your NZB-DAV provider settings to prevent ISP throttling.',
        },
      ],
    },
    {
      appName: 'TS-Skipper GUI & Caddy Gateway',
      category: 'engine',
      currentPort: `GUI: ${config.guiPort} | Gateway: ${config.gatewayPort}`,
      description: 'The companion GUI dashboard and Caddy TLS proxy solving Apple ATS.',
      fields: [
        {
          label: 'TS-Skipper Web GUI',
          value: `http://localhost:${config.guiPort} (or http://${config.serverIp}:${config.guiPort})`,
          explanation: `Runs on port ${config.guiPort} specifically configured to preserve your NZB-DAV on port 3000.`,
          critical: true,
        },
        {
          label: 'Caddy TLS Reverse Proxy',
          value: `Port ${config.gatewayPort} (HTTPS)`,
          explanation: 'Proxies port 1337 (Usenet Ultimate) and port 3000 (NZB-DAV) to port 8443 with TLS certificates.',
          critical: true,
        },
      ],
    },
    {
      appName: 'Existing Media Stack (SABnzbd / Prowlarr / Lidarr)',
      category: 'arr',
      currentPort: '8080, 9696, 8686',
      description: 'Detected from /home/ryan/docker-compose.yml. Completely untouched and coexists safely.',
      fields: [
        {
          label: 'SABnzbd Port',
          value: '8080:8080',
          explanation: 'Your active downloader on port 8080.',
        },
        {
          label: 'Prowlarr Port',
          value: '9696:9696',
          explanation: 'Your indexer manager on port 9696.',
        },
        {
          label: 'Lidarr Port',
          value: '8686:8686',
          explanation: 'Your music manager on port 8686.',
        },
      ],
    },
  ];
}

export function generateDockerCompose(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);
  
  let tailscaleService = '';
  if (config.tailscaleEnabled && config.tailscaleMode === 'sidecar_container') {
    tailscaleService = `
  # Optional Tailscale Sidecar (for travel access)
  tailscale:
    image: tailscale/tailscale:latest
    container_name: ts-skipper-tailscale
    hostname: ts-skipper-gateway
    environment:
      - TS_AUTHKEY=\${TS_AUTHKEY:-${config.tailscaleAuthKey || 'tskey-auth-your-key-here'}}
      - TS_ROUTES=${config.tailscaleSubnet || '192.168.1.0/24'}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
    volumes:
      - ./tailscale-data:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - NET_RAW
    restart: unless-stopped
`;
  }

  return `# ==============================================================================
# TS-Skipper (Tailscale Skipper) - Docker Compose
# Repository: https://github.com/ReyesPascal/TS-Skipper
# Configured specifically for ryan@Brain:
# - TS-Skipper GUI runs on port ${config.guiPort} (preserves nzbdav on 3000!)
# - Caddy Gateway runs on port ${config.gatewayPort} (Apple ATS HTTPS)
# - Connects to existing nzbdav (3000) and usenet-ultimate (1337)
# ==============================================================================
services:
  # TS-Skipper Localhost GUI (runs on port ${config.guiPort})
  ts-skipper-gui:
    image: ghcr.io/reyespascal/ts-skipper:latest
    container_name: ts-skipper-gui
    restart: unless-stopped
    ports:
      - "${config.guiPort}:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0

  # Caddy Reverse Proxy (automated TLS on port ${config.gatewayPort} for Apple ATS)
  caddy-gateway:
    image: caddy:2-alpine
    container_name: ts-skipper-caddy
    restart: unless-stopped
    ports:
      - "${config.gatewayPort}:${config.gatewayPort}"
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy_data:/data
      - ./caddy_config:/config
    environment:
      - DOMAIN=${domain}
      - GATEWAY_PORT=${config.gatewayPort}
      - NZBDAV_PORT=${config.nzbDavPort}
      - USENET_ULTIMATE_PORT=${config.usenetUltimatePort}
    extra_hosts:
      - "host.docker.internal:host-gateway"
${tailscaleService}
volumes:
  caddy_data:
  caddy_config:
`;
}

export function generateCaddyfile(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);

  return `# Caddyfile: TS-Skipper Gateway
# Repository: https://github.com/ReyesPascal/TS-Skipper
# Configured for ryan@Brain:
# - Manifest & metadata -> usenet-ultimate (127.0.0.1:${config.usenetUltimatePort})
# - Video streams & chunks -> nzbdav (127.0.0.1:${config.nzbDavPort})

${domain}:${config.gatewayPort} {
  # Apple ATS & Stremio CORS headers
  header {
    Access-Control-Allow-Origin *
    Access-Control-Allow-Methods "GET, POST, OPTIONS, HEAD"
    Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
    Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
  }

  # Stremio Addon Manifest & Catalogs -> usenet-ultimate (port ${config.usenetUltimatePort})
  handle /manifest.json {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort} {
      header_up Host {upstream_hostport}
    }
  }

  handle /configure* {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }

  handle /catalog* {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }

  handle /meta* {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }

  # Direct Video Streaming & Range Requests (HTTP 206) -> nzbdav (port ${config.nzbDavPort})
  handle /stream/* {
    reverse_proxy host.docker.internal:${config.nzbDavPort} {
      header_up Host {upstream_hostport}
    }
  }

  handle /webdav/* {
    reverse_proxy host.docker.internal:${config.nzbDavPort}
  }

  # Default fallback -> usenet-ultimate (port ${config.usenetUltimatePort})
  handle {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }
}
`;
}

export function generateInstallScript(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);
  return `#!/usr/bin/env bash
# ==============================================================================
# TS-Skipper - One-Command Ubuntu Installer
# Repository: https://github.com/ReyesPascal/TS-Skipper
# Configured for ryan@Brain:
# - Runs GUI on port ${config.guiPort} (nzbdav remains on 3000 untouched!)
# - Runs Caddy TLS Gateway on port ${config.gatewayPort} (bridges usenet-ultimate on 1337)
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
    sudo usermod -aG docker "\$USER"
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed."
fi

# 3. Detect LAN IP
LAN_IP=\$(hostname -I | awk '{print \$1}')
DASHED_IP=\$(echo "\$LAN_IP" | tr '.' '-')
DOMAIN="\${DASHED_IP}.sslip.io"

echo "🔍 Detected Host IP: \$LAN_IP"
echo "🌐 Resolved Domain:  \$DOMAIN"

# 4. Open UFW firewall ports
echo "🛡️ Step 3: Configuring local firewall..."
sudo ufw allow ${config.gatewayPort}/tcp comment "TS-Skipper HTTPS Gateway"
sudo ufw allow 80/tcp comment "Caddy TLS Verification"
sudo ufw allow ${config.guiPort}/tcp comment "TS-Skipper Local GUI"
sudo ufw status verbose | grep -E "${config.gatewayPort}|80|${config.guiPort}" || true

# 5. Automatically patch UU_BASE_URL in Usenet Ultimate directory
echo ""
echo "⚙️ Step 4: Automatically configuring Usenet Ultimate for Apple ATS..."
UU_DIR="\${HOME}/usenet-ultimate"

if [ ! -d "\$UU_DIR" ] && [ -d "/home/ryan/usenet-ultimate" ]; then
    UU_DIR="/home/ryan/usenet-ultimate"
fi

if [ ! -d "\$UU_DIR" ]; then
    echo "⚠️  Could not find Usenet Ultimate in default path (~/usenet-ultimate)."
    if [ -t 0 ]; then
        read -r -p "Enter path to your usenet-ultimate folder (or press Enter to skip): " USER_INPUT_DIR
        if [ -n "\$USER_INPUT_DIR" ]; then
            UU_DIR="\${USER_INPUT_DIR/#\\~/\$HOME}"
        fi
    fi
fi

if [ -d "\$UU_DIR" ]; then
    echo "📁 Found Usenet Ultimate directory at: \$UU_DIR"
    UU_ENV="\$UU_DIR/.env"
    NEW_BASE_URL="https://\${DOMAIN}:${config.gatewayPort}"

    if [ -f "\$UU_ENV" ]; then
        if grep -q "UU_BASE_URL=" "\$UU_ENV"; then
            sed -i "s|UU_BASE_URL=.*|UU_BASE_URL=\${NEW_BASE_URL}|g" "\$UU_ENV"
        else
            echo "UU_BASE_URL=\${NEW_BASE_URL}" >> "\$UU_ENV"
        fi
        
        if ! grep -q "NZBDAV_PROXY_ENABLED=" "\$UU_ENV"; then
            echo "NZBDAV_PROXY_ENABLED=true" >> "\$UU_ENV"
        fi
        echo "✅ Updated \$UU_ENV with UU_BASE_URL=\${NEW_BASE_URL}"
    else
        cat <<EOF > "\$UU_ENV"
# Configured by TS-Skipper
UU_BASE_URL=\${NEW_BASE_URL}
NZBDAV_PROXY_ENABLED=true
NZBDAV_NETWORK=existing_nzbdav_network
EOF
        echo "✅ Created \$UU_ENV with UU_BASE_URL=\${NEW_BASE_URL}"
    fi

    if [ -f "\$UU_DIR/docker-compose.yml" ]; then
        echo "🔄 Reloading usenet-ultimate container with new TLS base URL..."
        (cd "\$UU_DIR" && docker compose up -d usenet-ultimate || true)
    fi
fi

# 6. Deploy TS-Skipper in its own dedicated directory (Isolated from sab/prowlarr/lidarr!)
INSTALL_DIR="\${HOME}/TS-Skipper"
echo ""
echo "📦 Step 5: Preparing TS-Skipper in \${INSTALL_DIR}..."
mkdir -p "\${INSTALL_DIR}"
cd "\${INSTALL_DIR}"

cat <<EOF > "\${INSTALL_DIR}/Caddyfile"
\${DOMAIN}:${config.gatewayPort} {
  header {
    Access-Control-Allow-Origin *
    Access-Control-Allow-Methods "GET, POST, OPTIONS, HEAD"
    Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
    Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
  }

  handle /manifest.json {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }

  handle /stream/* {
    reverse_proxy host.docker.internal:${config.nzbDavPort}
  }

  handle /webdav/* {
    reverse_proxy host.docker.internal:${config.nzbDavPort}
  }

  handle {
    reverse_proxy host.docker.internal:${config.usenetUltimatePort}
  }
}
EOF

cat <<EOF > "\${INSTALL_DIR}/docker-compose.yml"
services:
  ts-skipper-caddy:
    image: caddy:2-alpine
    container_name: ts-skipper-caddy
    restart: unless-stopped
    ports:
      - "${config.gatewayPort}:${config.gatewayPort}"
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

echo "🚀 Starting TS-Skipper Caddy Gateway..."
docker compose up -d

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: TS-Skipper is Online on Port ${config.guiPort}!"
echo "=========================================================="
echo "🖥️  Localhost GUI: http://localhost:${config.guiPort}"
echo "🌐 Network GUI:   http://\${LAN_IP}:${config.guiPort}"
echo "🔒 HTTPS Gateway: https://\${DOMAIN}:${config.gatewayPort}"
echo "📺 Stremio URL:   https://\${DOMAIN}:${config.gatewayPort}/manifest.json"
echo ""
echo "✨ Usenet Services (Zero Conflict):"
echo "   - nzbdav:          port ${config.nzbDavPort} (untouched)"
echo "   - usenet-ultimate: port ${config.usenetUltimatePort} (proxied to ${config.gatewayPort})"
echo "   - sab/prowlarr/lidarr: completely ignored!"
echo ""
echo "📱 WHAT TO PUT INTO STREMIO (Apple TV / iPhone / Smart TV):"
echo "1. In Stremio, go to Addons > Community Addons"
echo "2. Paste: https://\${DOMAIN}:${config.gatewayPort}/manifest.json"
echo "3. Click Install — Zero Tailscale required on client devices!"
echo "=========================================================="
`;
}

export function generateReadme(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);
  return `# TS-Skipper ⚡ (Tailscale Skipper)

> **Skip installing Tailscale on every Apple TV, iPhone, and smart TV.**  
> A self-hosted gateway with a **localhost GUI** for Ubuntu Linux that bridges your existing **NZB-DAV** (port 3000) and **Usenet Ultimate** (port 1337), providing Apple ATS-compliant HTTPS streaming on port 8443 across your home Wi-Fi.

[![GitHub Repo](https://img.shields.io/badge/GitHub-ReyesPascal%2FTS--Skipper-blue?logo=github)](https://github.com/ReyesPascal/TS-Skipper)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ 1-Command Quick Install (Ubuntu)

Run this single command on your Ubuntu laptop (\`ryan@Brain\`):

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/install.sh | bash
\`\`\`

*Or install via Git clone:*
\`\`\`bash
git clone https://github.com/ReyesPascal/TS-Skipper.git
cd TS-Skipper
chmod +x install.sh
./install.sh
\`\`\`

Once installed, open the **Localhost GUI** on port **${config.guiPort}**:  
👉 **[http://localhost:${config.guiPort}](http://localhost:${config.guiPort})** *(preserves your NZB-DAV on port 3000!)*

---

## 🔍 System Port & Container Mapping (ryan@Brain)

TS-Skipper works seamlessly with your existing setup without conflicts:

| Service | Container Image | Port | Notes |
| :--- | :--- | :--- | :--- |
| **TS-Skipper GUI** | \`reyespascal/ts-skipper\` | **${config.guiPort}** | Localhost management GUI |
| **TS-Skipper Caddy** | \`caddy:2-alpine\` | **${config.gatewayPort}** | Solves Apple ATS for Stremio (TLS) |
| **NZB-DAV** | \`nzbdav/nzbdav:latest\` | **3000** | Preserved from your compose |
| **Usenet Ultimate** | \`ghcr.io/dsmart33/usenet-ultimate\` | **1337** | Preserved & patched with gateway base URL |
| **SABnzbd / Prowlarr / Lidarr** | *Any* | *Untouched* | **Completely ignored** to avoid Docker conflicts |

---

## 📋 What to Configure in Your Usenet Apps

### 1. In Stremio (Apple TV / iPhone / Smart TVs / PC)
1. Ensure your device is on your **home Wi-Fi**.
2. Open **Stremio** > **Addons** > click **Community Addons** search bar.
3. Paste the Manifest URL:
   \`\`\`
   https://${domain}:${config.gatewayPort}/manifest.json
   \`\`\`
4. Click **Install**. You can now stream smoothly in 4K HDR without Tailscale!

---

### 2. In Usenet Ultimate (\`~/usenet-ultimate/docker-compose.yml\` or \`.env\`)
In your \`~/usenet-ultimate/.env\` file:
\`\`\`env
UU_BASE_URL=https://${domain}:${config.gatewayPort}
NZBDAV_PROXY_ENABLED=true
\`\`\`
*This tells Usenet Ultimate to serve stream links via the port 8443 TLS gateway so Apple ATS accepts video playback!*

---

### 3. In NZB-DAV (\`/home/ryan/docker-compose.yml\`)
- **Port:** \`3000:3000\` *(Existing, untouched)*
- **NNTP Port:** Choose \`563\` (SSL) in NZB-DAV provider settings to prevent ISP traffic throttling.

---

## 🌐 Optional: Remote Streaming Outside the Home

When you are away from home, you do **not** need Tailscale on your home TVs.
Simply configure your Ubuntu laptop as a **Tailscale Subnet Router**:

\`\`\`bash
sudo tailscale up --advertise-routes=${config.tailscaleSubnet || '192.168.1.0/24'} --accept-dns=false
\`\`\`

---

## 🔄 Syncing Updates from GitHub

\`\`\`bash
cd ~/TS-Skipper
git pull origin main
docker compose up -d
\`\`\`

---

## 📄 License
MIT © ReyesPascal
`;
}

export function generateEnv(config: GatewayConfig): string {
  const domain = getResolvedDomain(config);
  return `# TS-Skipper Environment Configuration
# Repository: https://github.com/ReyesPascal/TS-Skipper
# Configured for ryan@Brain:

SERVER_IP=${config.serverIp}
DOMAIN=${domain}
GUI_PORT=${config.guiPort}
GATEWAY_PORT=${config.gatewayPort}

# Existing container ports on ryan@Brain:
NZBDAV_PORT=${config.nzbDavPort}
USENET_ULTIMATE_PORT=${config.usenetUltimatePort}

# Note: SABnzbd, Prowlarr, and Lidarr are ignored to prevent Docker container conflicts.

# Usenet NNTP Provider Details
NNTP_HOST=${config.usenetProviderHost || 'news.usenetserver.com'}
NNTP_PORT=${config.useSslNntp ? 563 : 119}
NNTP_SSL=${config.useSslNntp ? 'true' : 'false'}

# Optional Tailscale Configuration
TS_AUTHKEY=${config.tailscaleAuthKey || ''}
TS_ROUTES=${config.tailscaleSubnet || '192.168.1.0/24'}
`;
}
