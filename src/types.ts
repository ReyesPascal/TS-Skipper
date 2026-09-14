export interface GatewayConfig {
  serverIp: string;
  guiPort: number; // 3002 (so it does not conflict with nzbdav on 3000)
  gatewayPort: number; // 8443 (Caddy HTTPS for Apple ATS)
  nzbDavPort: number; // 3000 (from your nzbdav docker-compose.yml)
  usenetUltimatePort: number; // 1337 (from your usenet-ultimate docker-compose.yml)
  sabnzbdPort: number; // 8080
  prowlarrPort: number; // 9696
  lidarrPort: number; // 8686
  domainMode: 'sslip' | 'local_ip' | 'duckdns' | 'custom';
  customDomain: string;
  duckDnsToken: string;
  tailscaleEnabled: boolean;
  tailscaleMode: 'subnet_router' | 'serve' | 'sidecar_container';
  tailscaleSubnet: string;
  tailscaleAuthKey: string;
  usenetProviderHost: string;
  usenetProviderPort: number;
  useSslNntp: boolean;
  dockerNetworkName: string; // e.g. existing_nzbdav_network
}

export interface AtsCheckResult {
  passed: boolean;
  score: number;
  checks: {
    name: string;
    description: string;
    passed: boolean;
    recommendation?: string;
  }[];
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  internal: boolean;
  isTailscale?: boolean;
}

export interface AppConfigGuide {
  appName: string;
  category: 'engine' | 'addon' | 'player' | 'arr';
  currentPort: string;
  description: string;
  fields: {
    label: string;
    value: string;
    explanation: string;
    critical?: boolean;
  }[];
}
