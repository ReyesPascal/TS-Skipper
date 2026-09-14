# TS-Skipper ⚡ (Tailscale Skipper)

> **Skip installing Tailscale on every Apple TV, iPhone, and smart TV.**  
> A self-hosted gateway with a **localhost GUI** on port **3002** for Ubuntu Linux that bridges your existing **NZB-DAV** (port 3000) and **Usenet Ultimate** (port 1337), providing Apple ATS-compliant HTTPS streaming on port 8443 across your home Wi-Fi.

[![GitHub Repo](https://img.shields.io/badge/GitHub-ReyesPascal%2FTS--Skipper-blue?logo=github)](https://github.com/ReyesPascal/TS-Skipper)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ 1-Command Quick Install (Ubuntu)

Run this single command on your Ubuntu laptop (`ryan@Brain`):

```bash
curl -fsSL https://raw.githubusercontent.com/ReyesPascal/TS-Skipper/main/install.sh | bash
```

*Or install via Git clone:*
```bash
git clone https://github.com/ReyesPascal/TS-Skipper.git
cd TS-Skipper
chmod +x install.sh
./install.sh
```

Once installed, open the **Localhost GUI** on port **3002**:  
👉 **[http://localhost:3002](http://localhost:3002)** *(or `http://YOUR-UBUNTU-IP:3002`)*  
*(Note: Port 3002 is specifically chosen so it never conflicts with your NZB-DAV running on port 3000!)*

---

## 🔍 System Port & Container Mapping (ryan@Brain)

TS-Skipper fits directly into your existing configuration without needing to rebuild or change your running containers:

| Service | Container / Source | Port | Status / Purpose |
| :--- | :--- | :--- | :--- |
| **TS-Skipper GUI** | `ghcr.io/reyespascal/ts-skipper` | **3002** | Localhost management web interface |
| **TS-Skipper Caddy** | `caddy:2-alpine` | **8443** | Solves Apple ATS for Stremio via TLS |
| **NZB-DAV** | `nzbdav/nzbdav:latest` | **3000** | Preserved from `/home/ryan/docker-compose.yml` |
| **Usenet Ultimate** | `ghcr.io/dsmart33/usenet-ultimate` | **1337** | Preserved from `~/usenet-ultimate/docker-compose.yml` |
| **SABnzbd** | `linuxserver/sabnzbd:latest` | **8080** | Untouched from `/home/ryan/docker-compose.yml` |
| **Prowlarr** | `linuxserver/prowlarr:latest` | **9696** | Untouched from `/home/ryan/docker-compose.yml` |
| **Lidarr** | `linuxserver/lidarr:latest` | **8686** | Untouched from `/home/ryan/docker-compose.yml` |

---

## 💡 The Problem & How TS-Skipper Solves It

### 1. The Root Cause (Apple App Transport Security)
Apple devices (Apple TV, iOS, iPadOS, Mac) enforce **App Transport Security (ATS)**. ATS strictly blocks video players like Stremio from connecting to unencrypted `http://` stream and manifest URLs (such as `http://192.168.1.150:3000` or `http://127.0.0.1:1337`).

### 2. Why Tailscale "Fixed" It Previously
Tailscale assigned an encrypted point-to-point IP and MagicDNS name with an auto-provisioned TLS certificate, which tricked Apple ATS into permitting the connection.

### 3. The Downside of Client Tailscale
- You had to install, authenticate, and run the Tailscale client on every Apple TV, living room TV, iPad, and guest device.
- Unnecessary battery drain and management overhead for devices that never leave your living room.

### 4. The TS-Skipper Solution (Zero Client-Side Tailscale)
TS-Skipper runs an automated **Caddy TLS Reverse Proxy** directly on your Ubuntu machine on port **8443**. Using `sslip.io` (e.g. `https://192-168-1-150.sslip.io:8443`), it auto-issues valid TLS certificates for your local LAN IP.
- **Apple TV & iPhone:** Connects directly over local Wi-Fi. Full ATS compliance, hardware video acceleration, and zero connection drops.
- **Zero Client Software:** No VPN, no Tailscale profile, and no login needed on any TV or phone.

---

## 📋 What to Configure in Your Usenet Apps

### 1. In Stremio (Apple TV / iPhone / Smart TVs / PC)
1. Connect your device to your **home Wi-Fi**.
2. Open **Stremio** > **Addons** > click the **Community Addons** search bar.
3. Paste the Manifest URL:
   ```
   https://YOUR-UBUNTU-IP.sslip.io:8443/manifest.json
   ```
   *(e.g., if your Ubuntu laptop is `192.168.1.150`, paste: `https://192-168-1-150.sslip.io:8443/manifest.json`)*
4. Click **Install**. You can now stream smoothly in 4K HDR without Tailscale!

---

### 2. In Usenet Ultimate (`~/usenet-ultimate/docker-compose.yml` or `.env`)
In your `~/usenet-ultimate/.env` file:
```env
UU_BASE_URL=https://YOUR-UBUNTU-IP.sslip.io:8443
NZBDAV_PROXY_ENABLED=true
NZBDAV_NETWORK=existing_nzbdav_network
```
*Crucial: Setting `UU_BASE_URL` to the port 8443 HTTPS URL ensures that Usenet Ultimate serves video stream links via the TLS proxy so Apple ATS does not reject video playback!*

---

### 3. In NZB-DAV (`/home/ryan/docker-compose.yml`)
- **Port:** `3000:3000` *(Existing, preserved)*
- **NNTP Port:** Choose `563` (SSL) in NZB-DAV provider settings to prevent ISP traffic throttling.

---

### 4. In Infuse / Kodi / VLC (Direct WebDAV Streaming)
- **Protocol**: WebDAV (HTTPS)
- **Server Address**: `YOUR-UBUNTU-IP.sslip.io`
- **Port**: `8443`
- **Path**: `/webdav/` or `/stream/`

---

## 🌐 Optional: Remote Streaming Outside the Home

When you are away from home, you do **not** need Tailscale on your home TVs.
Simply configure your Ubuntu laptop as a **Tailscale Subnet Router**:

```bash
sudo tailscale up --advertise-routes=192.168.1.0/24 --accept-dns=false
```

---

## 🔄 Syncing Updates from GitHub

```bash
cd ~/TS-Skipper
git pull origin main
docker compose up -d
```

---

## 📄 License
MIT © ReyesPascal
