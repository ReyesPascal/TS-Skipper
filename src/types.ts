export interface GatewayConfig {
  serverIp: string;
  guiPort: number; // 3002 (so it never conflicts with nzbdav on 3000)
  gatewayPort: number; // 8443 (Caddy HTTPS for Apple ATS)
  nzbDavPort: number; // 3000 (from your existing nzbdav container)
  usenetUltimatePort: number; // 1337 (from your existing usenet-ultimate container)
  usenetUltimateDir: string; // e.g. /home/ryan/usenet-ultimate or ~/usenet-ultimate
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
  dockerNetworkName: string;
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

export interface PatchResult {
  success: boolean;
  message: string;
  filePath?: string;
  previousBaseUrl?: string;
  newBaseUrl?: string;
}
