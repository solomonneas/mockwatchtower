/**
 * Mock data for static demo mode
 * All API endpoints return this data instead of making real network requests
 */

import type { Topology } from '../types/topology'
import type { AlertSummary } from '../types/alert'
import type { L3Topology } from '../types/vlan'
import type { VMListResponse } from '../api/endpoints'
import type { Interface } from '../types/device'

/**
 * Generate realistic Cisco Catalyst 9300 stack interfaces
 * 4 slots x 48 ports = 192 ports total
 */
function generateCatalystStackInterfaces(seed: number): Interface[] {
  const interfaces: Interface[] = []

  // Deterministic "random" based on seed
  const rand = (i: number) => {
    const x = Math.sin(seed + i) * 10000
    return x - Math.floor(x)
  }

  let portIndex = 0
  for (let slot = 1; slot <= 4; slot++) {
    for (let port = 1; port <= 48; port++) {
      portIndex++
      const r = rand(portIndex)

      // Port naming: last 4 ports per slot are 10G uplink-capable
      const is10G = port >= 45
      const name = is10G
        ? `Te${slot}/0/${port}`
        : `Gi${slot}/0/${port}`

      // Determine port state distribution:
      // 55% up with traffic, 15% up no traffic, 20% admin down, 10% down/error
      let status: 'up' | 'down' = 'up'
      let adminStatus: 'up' | 'down' = 'up'
      let utilization = 0
      let inBps = 0
      let outBps = 0
      let errorsIn = 0
      let errorsOut = 0
      let alias = ''
      let isTrunk = false
      let poeEnabled = false
      let poePower = 0

      if (r < 0.55) {
        // Up with traffic
        status = 'up'
        const util = rand(portIndex + 1000) * 45 + 2 // 2-47% utilization
        utilization = Math.round(util * 10) / 10
        const speed = is10G ? 10000000000 : 1000000000
        inBps = Math.round(speed * (util / 100) * (0.3 + rand(portIndex + 2000) * 0.7))
        outBps = Math.round(speed * (util / 100) * (0.3 + rand(portIndex + 3000) * 0.7))

        // Assign realistic descriptions
        const descOptions = [
          'Server-ESXi', 'AP-Floor2', 'Printer-HR', 'Desktop', 'VoIP-Phone',
          'Camera-Lobby', 'Server-DB', 'Server-Web', 'AP-Conf-Room', 'Workstation',
          'iDRAC', 'Storage-NAS', 'Server-App', 'Badge-Reader', 'AV-Display'
        ]
        alias = descOptions[Math.floor(rand(portIndex + 4000) * descOptions.length)]

        // Some ports are trunks (servers, APs, etc)
        isTrunk = alias.includes('Server') || alias.includes('AP') || rand(portIndex + 5000) < 0.1

        // PoE for phones, APs, cameras, badge readers
        if (alias.includes('Phone') || alias.includes('AP') || alias.includes('Camera') || alias.includes('Badge')) {
          poeEnabled = true
          poePower = Math.round((5 + rand(portIndex + 6000) * 25) * 10) / 10 // 5-30W
        }
      } else if (r < 0.70) {
        // Up but no/minimal traffic (connected but idle)
        status = 'up'
        utilization = Math.round(rand(portIndex + 7000) * 2 * 10) / 10 // 0-2%
        const speed = is10G ? 10000000000 : 1000000000
        inBps = Math.round(speed * 0.001 * rand(portIndex + 8000))
        outBps = Math.round(speed * 0.001 * rand(portIndex + 9000))
        alias = 'Reserved'
      } else if (r < 0.90) {
        // Admin down (unused ports)
        status = 'down'
        adminStatus = 'down'
        alias = ''
      } else {
        // Down with errors (problem ports)
        status = 'down'
        errorsIn = Math.floor(rand(portIndex + 10000) * 500)
        errorsOut = Math.floor(rand(portIndex + 11000) * 100)
        alias = rand(portIndex + 12000) < 0.5 ? 'FAULTY-CABLE' : 'Desktop-Disconnected'
      }

      interfaces.push({
        name,
        status,
        admin_status: adminStatus,
        alias: alias || undefined,
        is_trunk: isTrunk || undefined,
        poe_enabled: poeEnabled || undefined,
        poe_power: poePower || undefined,
        speed: is10G ? 10000 : 1000,
        in_bps: inBps,
        out_bps: outBps,
        utilization,
        errors_in: errorsIn,
        errors_out: errorsOut,
      })
    }
  }

  return interfaces
}

// Generate interfaces for both core switches
const coreSw1Interfaces = generateCatalystStackInterfaces(42)
const coreSw2Interfaces = generateCatalystStackInterfaces(137)

// Count ports for switch_stats
const countPorts = (ifaces: Interface[]) => ({
  up: ifaces.filter(i => i.status === 'up').length,
  down: ifaces.filter(i => i.status === 'down').length,
})
const sw1Counts = countPorts(coreSw1Interfaces)
const sw2Counts = countPorts(coreSw2Interfaces)

export const mockTopology: Topology = {
  clusters: [
    {
      id: 'core',
      name: 'Core Network',
      cluster_type: 'network',
      icon: 'server',
      position: { x: 400, y: 100 },
      device_ids: ['core-sw-1', 'core-sw-2'],
      status: 'active',
    },
    {
      id: 'firewalls',
      name: 'Firewalls',
      cluster_type: 'security',
      icon: 'shield',
      position: { x: 400, y: 300 },
      device_ids: ['fw-edge-1'],
      status: 'active',
    },
    {
      id: 'servers',
      name: 'Servers',
      cluster_type: 'compute',
      icon: 'server',
      position: { x: 600, y: 200 },
      device_ids: ['srv-web-1', 'srv-db-1', 'srv-app-1'],
      status: 'active',
    },
    {
      id: 'hypervisors',
      name: 'Hypervisors',
      cluster_type: 'virtualization',
      icon: 'cpu',
      position: { x: 200, y: 200 },
      device_ids: ['hv-prod-1', 'hv-prod-2'],
      status: 'active',
    },
  ],
  devices: {
    'core-sw-1': {
      id: 'core-sw-1',
      display_name: 'Core Switch Stack 1',
      model: 'Cisco Catalyst 9300-48P (4-member stack)',
      ip: '10.10.1.1',
      status: 'up',
      device_type: 'switch',
      cluster_id: 'core',
      stats: { cpu: 18, memory: 45, uptime: 8640000 },
      interfaces: coreSw1Interfaces,
      switch_stats: {
        ports_up: sw1Counts.up,
        ports_down: sw1Counts.down,
        poe_budget_used: 847,
        poe_budget_total: 1440,
        is_stp_root: true,
      },
      alert_count: 0,
    },
    'core-sw-2': {
      id: 'core-sw-2',
      display_name: 'Core Switch Stack 2',
      model: 'Cisco Catalyst 9300-48P (4-member stack)',
      ip: '10.10.1.2',
      status: 'up',
      device_type: 'switch',
      cluster_id: 'core',
      stats: { cpu: 15, memory: 42, uptime: 8640000 },
      interfaces: coreSw2Interfaces,
      switch_stats: {
        ports_up: sw2Counts.up,
        ports_down: sw2Counts.down,
        poe_budget_used: 723,
        poe_budget_total: 1440,
        is_stp_root: false,
      },
      alert_count: sw2Counts.down > 30 ? 1 : 0,
    },
    'fw-edge-1': {
      id: 'fw-edge-1',
      display_name: 'Edge Firewall',
      model: 'Fortinet FortiGate 200F',
      ip: '10.10.1.10',
      status: 'up',
      device_type: 'firewall',
      cluster_id: 'firewalls',
      stats: { cpu: 28, memory: 55, uptime: 2592000 },
      interfaces: [
        { name: 'eth0', status: 'up', speed: 1000, in_bps: 180000000, out_bps: 95000000, utilization: 28, errors_in: 0, errors_out: 0 },
        { name: 'eth1', status: 'up', speed: 10000, in_bps: 95000000, out_bps: 180000000, utilization: 3, errors_in: 0, errors_out: 0 },
      ],
      firewall_stats: { sessions_active: 12450, throughput_in: 180000000, throughput_out: 95000000, threats_blocked_24h: 847 },
      alert_count: 0,
    },
    'srv-web-1': {
      id: 'srv-web-1',
      display_name: 'Web Server',
      model: 'Dell PowerEdge R640',
      ip: '10.10.2.1',
      status: 'up',
      device_type: 'server',
      cluster_id: 'servers',
      stats: { cpu: 45, memory: 62, uptime: 5184000, load: [2.1, 1.8, 1.5] },
      interfaces: [
        { name: 'eth0', status: 'up', speed: 1000, in_bps: 18000000, out_bps: 25000000, utilization: 4, errors_in: 0, errors_out: 0 },
      ],
      alert_count: 0,
    },
    'srv-db-1': {
      id: 'srv-db-1',
      display_name: 'Database Server',
      model: 'Dell PowerEdge R740',
      ip: '10.10.2.2',
      status: 'down',
      device_type: 'server',
      cluster_id: 'servers',
      stats: { cpu: 0, memory: 0, uptime: 0 },
      interfaces: [
        { name: 'eth0', status: 'down', speed: 1000, in_bps: 0, out_bps: 0, utilization: 0, errors_in: 0, errors_out: 0 },
      ],
      alert_count: 1,
    },
    'srv-app-1': {
      id: 'srv-app-1',
      display_name: 'App Server',
      model: 'Dell PowerEdge R640',
      ip: '10.10.2.3',
      status: 'up',
      device_type: 'server',
      cluster_id: 'servers',
      stats: { cpu: 32, memory: 48, uptime: 5184000, load: [1.2, 1.0, 0.9] },
      interfaces: [
        { name: 'eth0', status: 'up', speed: 1000, in_bps: 32000000, out_bps: 45000000, utilization: 8, errors_in: 0, errors_out: 0 },
      ],
      alert_count: 0,
    },
    'hv-prod-1': {
      id: 'hv-prod-1',
      display_name: 'Proxmox Node 1',
      model: 'Dell PowerEdge R750',
      ip: '10.10.3.1',
      status: 'up',
      device_type: 'server',
      cluster_id: 'hypervisors',
      stats: { cpu: 58, memory: 72, uptime: 7776000, load: [4.2, 3.8, 3.5] },
      interfaces: [
        { name: 'eno1', status: 'up', speed: 10000, in_bps: 720000000, out_bps: 890000000, utilization: 16, errors_in: 0, errors_out: 0 },
      ],
      proxmox_stats: { vms_running: 8, vms_stopped: 2, containers_running: 5, containers_stopped: 1, ceph_used_percent: 45 },
      alert_count: 0,
    },
    'hv-prod-2': {
      id: 'hv-prod-2',
      display_name: 'Proxmox Node 2',
      model: 'Dell PowerEdge R750',
      ip: '10.10.3.2',
      status: 'up',
      device_type: 'server',
      cluster_id: 'hypervisors',
      stats: { cpu: 42, memory: 65, uptime: 7776000, load: [3.1, 2.9, 2.7] },
      interfaces: [
        { name: 'eno1', status: 'up', speed: 10000, in_bps: 650000000, out_bps: 720000000, utilization: 14, errors_in: 0, errors_out: 0 },
      ],
      proxmox_stats: { vms_running: 6, vms_stopped: 1, containers_running: 4, containers_stopped: 0, ceph_used_percent: 45 },
      alert_count: 0,
    },
  },
  connections: [
    {
      id: 'c1',
      source: { device: 'core-sw-1', port: 'Te1/0/1' },
      target: { device: 'core-sw-2', port: 'Te1/0/1' },
      connection_type: 'stack',
      status: 'up',
      speed: 10000,
      utilization: 8,
      in_bps: 450000000,
      out_bps: 380000000,
      errors: 0,
      discards: 0,
    },
    {
      id: 'c2',
      source: { device: 'core-sw-1', port: 'Te1/0/48' },
      target: { device: 'fw-edge-1', port: 'eth1' },
      connection_type: 'uplink',
      status: 'up',
      speed: 10000,
      utilization: 3,
      in_bps: 120000000,
      out_bps: 95000000,
      errors: 0,
      discards: 0,
    },
    {
      id: 'c3',
      source: { device: 'core-sw-1', port: 'Gi1/0/1' },
      target: { device: 'srv-web-1', port: 'eth0' },
      connection_type: 'access',
      status: 'up',
      speed: 1000,
      utilization: 4,
      in_bps: 25000000,
      out_bps: 18000000,
      errors: 0,
      discards: 0,
    },
    {
      id: 'c4',
      source: { device: 'core-sw-2', port: 'Gi1/0/1' },
      target: { device: 'srv-db-1', port: 'eth0' },
      connection_type: 'access',
      status: 'down',
      speed: 1000,
      utilization: 0,
      in_bps: 0,
      out_bps: 0,
      errors: 12,
      discards: 0,
    },
    {
      id: 'c5',
      source: { device: 'core-sw-2', port: 'Gi1/0/2' },
      target: { device: 'srv-app-1', port: 'eth0' },
      connection_type: 'access',
      status: 'up',
      speed: 1000,
      utilization: 8,
      in_bps: 45000000,
      out_bps: 32000000,
      errors: 0,
      discards: 0,
    },
    {
      id: 'c6',
      source: { device: 'core-sw-1', port: 'Te1/0/10' },
      target: { device: 'hv-prod-1', port: 'eno1' },
      connection_type: 'trunk',
      status: 'up',
      speed: 10000,
      utilization: 16,
      in_bps: 890000000,
      out_bps: 720000000,
      errors: 0,
      discards: 0,
    },
    {
      id: 'c7',
      source: { device: 'core-sw-2', port: 'Te1/0/10' },
      target: { device: 'hv-prod-2', port: 'eno1' },
      connection_type: 'trunk',
      status: 'up',
      speed: 10000,
      utilization: 14,
      in_bps: 720000000,
      out_bps: 650000000,
      errors: 0,
      discards: 0,
    },
  ],
  external_links: [
    {
      id: 'wan-1',
      source: { device: 'fw-edge-1', port: 'eth0' },
      target: { label: 'Internet', type: 'cloud', icon: 'cloud', external: true },
      provider: 'Cogent',
      circuit_id: 'COG-12345',
      speed: 1000,
      sla: '99.9%',
      description: 'Primary WAN uplink',
      status: 'up',
      utilization: 28,
      in_bps: 180000000,
      out_bps: 95000000,
    },
  ],
  total_devices: 8,
  devices_up: 7,
  devices_down: 1,
  active_alerts: 1,
}

export const mockAlerts: AlertSummary[] = [
  {
    id: '1',
    device_id: 'srv-db-1',
    severity: 'critical',
    message: 'Device unreachable: no ICMP response',
    status: 'active',
    timestamp: new Date().toISOString(),
  },
]

// Full speedtest result matching SpeedtestResult interface
export const mockSpeedtest = {
  timestamp: new Date().toISOString(),
  download_mbps: 487.5,
  upload_mbps: 462.3,
  ping_ms: 11.2,
  jitter_ms: 2.4,
  packet_loss_pct: 0.0,
  server_id: 18531,
  server_name: 'Comcast',
  server_location: 'Atlanta, GA',
  result_url: 'https://www.speedtest.net/result/14523847291',
  status: 'completed',
  indicator: 'normal' as const,
}

// Port group aggregation stats
export interface PortGroupStats {
  name: string
  description: string
  port_count: number
  active_port_count: number
  in_bps: number
  out_bps: number
  in_mbps: number
  out_mbps: number
  total_mbps: number
  status: 'ok' | 'warning' | 'critical'
  thresholds: {
    warning_mbps: number
    critical_mbps: number
  }
}

// Calculate aggregated traffic from switch interfaces
function calculatePortGroupStats(
  name: string,
  description: string,
  interfaces: Interface[],
  portPattern: RegExp,
  warningMbps: number,
  criticalMbps: number
): PortGroupStats {
  const matchingPorts = interfaces.filter(i => portPattern.test(i.name))
  const activePorts = matchingPorts.filter(i => i.status === 'up' && i.in_bps > 0)

  const inBps = activePorts.reduce((sum, p) => sum + p.in_bps, 0)
  const outBps = activePorts.reduce((sum, p) => sum + p.out_bps, 0)
  const inMbps = inBps / 1_000_000
  const outMbps = outBps / 1_000_000
  const totalMbps = inMbps + outMbps

  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (totalMbps >= criticalMbps) status = 'critical'
  else if (totalMbps >= warningMbps) status = 'warning'

  return {
    name,
    description,
    port_count: matchingPorts.length,
    active_port_count: activePorts.length,
    in_bps: inBps,
    out_bps: outBps,
    in_mbps: Math.round(inMbps * 10) / 10,
    out_mbps: Math.round(outMbps * 10) / 10,
    total_mbps: Math.round(totalMbps * 10) / 10,
    status,
    thresholds: {
      warning_mbps: warningMbps,
      critical_mbps: criticalMbps,
    },
  }
}

// Combine both switch stacks for aggregate calculations
const allSwitchInterfaces = [...coreSw1Interfaces, ...coreSw2Interfaces]

export const mockPortGroups: PortGroupStats[] = [
  // Server uplinks (10G ports connected to hypervisors and servers)
  calculatePortGroupStats(
    'Server Uplinks',
    'Aggregated 10G uplinks to hypervisors and server infrastructure',
    allSwitchInterfaces,
    /^Te[1-4]\/0\/(45|46|47|48)$/, // 10G uplink ports
    15000, // 15 Gbps warning
    35000  // 35 Gbps critical
  ),
  // User access ports (1G ports on slots 1-2)
  calculatePortGroupStats(
    'User Access',
    'End-user workstation and VoIP phone connections',
    allSwitchInterfaces,
    /^Gi[1-2]\/0\/[0-9]+$/, // Slots 1-2 GigE ports
    8000,  // 8 Gbps warning
    15000  // 15 Gbps critical
  ),
  // IoT and building systems (1G ports on slots 3-4)
  calculatePortGroupStats(
    'IoT & Building',
    'Access points, cameras, badge readers, and building automation',
    allSwitchInterfaces,
    /^Gi[3-4]\/0\/[0-9]+$/, // Slots 3-4 GigE ports
    5000,  // 5 Gbps warning
    10000  // 10 Gbps critical
  ),
]

export const mockVMs: VMListResponse = {
  vms: [
    { vmid: 100, name: 'web-prod', node: 'hv-prod-1', instance: 'pve1', type: 'qemu', status: 'running', cpu: 12.5, memory: 45.2, cpus: 4, maxmem: 8589934592, uptime: 5184000, netin: 125000000, netout: 89000000 },
    { vmid: 101, name: 'db-mysql', node: 'hv-prod-1', instance: 'pve1', type: 'qemu', status: 'running', cpu: 35.8, memory: 72.1, cpus: 8, maxmem: 17179869184, uptime: 5184000, netin: 450000000, netout: 320000000 },
    { vmid: 102, name: 'app-api', node: 'hv-prod-2', instance: 'pve2', type: 'qemu', status: 'running', cpu: 8.3, memory: 38.5, cpus: 4, maxmem: 8589934592, uptime: 5184000, netin: 78000000, netout: 95000000 },
    { vmid: 103, name: 'monitoring', node: 'hv-prod-2', instance: 'pve2', type: 'lxc', status: 'running', cpu: 15.2, memory: 52.0, cpus: 2, maxmem: 4294967296, uptime: 7776000, netin: 25000000, netout: 18000000 },
    { vmid: 104, name: 'dev-test', node: 'hv-prod-2', instance: 'pve2', type: 'qemu', status: 'stopped', cpu: 0, memory: 0, cpus: 2, maxmem: 4294967296, uptime: null, netin: null, netout: null },
  ],
  summary: {
    total_running: 4,
    total_qemu: 4,
    total_lxc: 1,
    total_cpus: 20,
    total_memory_gb: 42,
  },
}

// Pre-generated Mermaid diagram for the mock topology
export const mockMermaidDiagram = `flowchart TB
    subgraph core["Core Network"]
        core-sw-1{{"Core Switch Stack 1<br/><small>10.10.1.1</small>"}}
        core-sw-2{{"Core Switch Stack 2<br/><small>10.10.1.2</small>"}}
    end

    subgraph firewalls["Firewalls"]
        fw-edge-1[/"Edge Firewall<br/><small>10.10.1.10</small>"\\]
    end

    subgraph servers["Servers"]
        srv-web-1["Web Server<br/><small>10.10.2.1</small>"]
        srv-db-1["Database Server<br/><small>10.10.2.2</small>"]
        srv-app-1["App Server<br/><small>10.10.2.3</small>"]
    end

    subgraph hypervisors["Hypervisors"]
        hv-prod-1["Proxmox Node 1<br/><small>10.10.3.1</small>"]
        hv-prod-2["Proxmox Node 2<br/><small>10.10.3.2</small>"]
    end

    internet(("Internet<br/>☁️"))

    core-sw-1 <-->|"10G Stack"| core-sw-2
    core-sw-1 <-->|"10G Uplink"| fw-edge-1
    fw-edge-1 -.->|"1G WAN<br/>Cogent"| internet
    core-sw-1 -->|"1G"| srv-web-1
    core-sw-2 -->|"1G"| srv-db-1
    core-sw-2 -->|"1G"| srv-app-1
    core-sw-1 <-->|"10G Trunk"| hv-prod-1
    core-sw-2 <-->|"10G Trunk"| hv-prod-2

    classDef down fill:#dc2626,stroke:#991b1b,color:#fff
    classDef switch fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef firewall fill:#f97316,stroke:#c2410c,color:#fff
    classDef server fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef external fill:#6b7280,stroke:#374151,color:#fff

    class core-sw-1,core-sw-2 switch
    class fw-edge-1 firewall
    class srv-web-1,srv-app-1,hv-prod-1,hv-prod-2 server
    class srv-db-1 down
    class internet external
`

// Proxmox node detail data for the panel view
export interface ProxmoxNodeDetail {
  node: {
    node: string
    status: string
    cpu: number
    memory: number
    maxcpu: number
    maxmem: number
    uptime: number
  } | null
  vms: Array<{
    vmid: number
    name: string
    type: string
    status: string
    cpu: number
    memory: number
  }>
  lxcs: Array<{
    vmid: number
    name: string
    type: string
    status: string
    cpu: number
    memory: number
  }>
  storage: Array<{
    storage: string
    type: string
    used: number
    total: number
    used_percent: number
  }>
  vms_running: number
  vms_total: number
  lxcs_running: number
  lxcs_total: number
}

export const mockProxmoxNodes: Record<string, ProxmoxNodeDetail> = {
  'hv-prod-1': {
    node: {
      node: 'hv-prod-1',
      status: 'online',
      cpu: 58.2,
      memory: 72.4,
      maxcpu: 32,
      maxmem: 137438953472, // 128GB
      uptime: 7776000,
    },
    vms: [
      { vmid: 100, name: 'web-prod', type: 'qemu', status: 'running', cpu: 12.5, memory: 45.2 },
      { vmid: 101, name: 'db-mysql', type: 'qemu', status: 'running', cpu: 35.8, memory: 72.1 },
      { vmid: 105, name: 'mail-server', type: 'qemu', status: 'running', cpu: 8.2, memory: 28.5 },
      { vmid: 106, name: 'backup-primary', type: 'qemu', status: 'running', cpu: 2.1, memory: 15.3 },
      { vmid: 110, name: 'dev-staging', type: 'qemu', status: 'stopped', cpu: 0, memory: 0 },
    ],
    lxcs: [
      { vmid: 200, name: 'dns-primary', type: 'lxc', status: 'running', cpu: 1.2, memory: 8.5 },
      { vmid: 201, name: 'nginx-proxy', type: 'lxc', status: 'running', cpu: 5.8, memory: 22.1 },
      { vmid: 202, name: 'redis-cache', type: 'lxc', status: 'running', cpu: 3.4, memory: 35.6 },
    ],
    storage: [
      { storage: 'local', type: 'dir', used: 42949672960, total: 107374182400, used_percent: 40.0 },
      { storage: 'local-lvm', type: 'lvmthin', used: 536870912000, total: 1099511627776, used_percent: 48.8 },
      { storage: 'ceph-pool', type: 'rbd', used: 2199023255552, total: 4398046511104, used_percent: 50.0 },
      { storage: 'nfs-backup', type: 'nfs', used: 8796093022208, total: 10995116277760, used_percent: 80.0 },
    ],
    vms_running: 4,
    vms_total: 5,
    lxcs_running: 3,
    lxcs_total: 3,
  },
  'hv-prod-2': {
    node: {
      node: 'hv-prod-2',
      status: 'online',
      cpu: 42.8,
      memory: 65.2,
      maxcpu: 32,
      maxmem: 137438953472, // 128GB
      uptime: 7776000,
    },
    vms: [
      { vmid: 102, name: 'app-api', type: 'qemu', status: 'running', cpu: 8.3, memory: 38.5 },
      { vmid: 104, name: 'dev-test', type: 'qemu', status: 'stopped', cpu: 0, memory: 0 },
      { vmid: 107, name: 'gitlab-runner', type: 'qemu', status: 'running', cpu: 22.4, memory: 45.8 },
      { vmid: 108, name: 'jenkins', type: 'qemu', status: 'running', cpu: 15.2, memory: 52.3 },
    ],
    lxcs: [
      { vmid: 103, name: 'monitoring', type: 'lxc', status: 'running', cpu: 15.2, memory: 52.0 },
      { vmid: 203, name: 'dns-secondary', type: 'lxc', status: 'running', cpu: 0.8, memory: 6.2 },
      { vmid: 204, name: 'log-collector', type: 'lxc', status: 'running', cpu: 4.5, memory: 28.4 },
      { vmid: 205, name: 'metrics-db', type: 'lxc', status: 'running', cpu: 12.8, memory: 42.1 },
    ],
    storage: [
      { storage: 'local', type: 'dir', used: 32212254720, total: 107374182400, used_percent: 30.0 },
      { storage: 'local-lvm', type: 'lvmthin', used: 483183820800, total: 1099511627776, used_percent: 43.9 },
      { storage: 'ceph-pool', type: 'rbd', used: 1759218604442, total: 4398046511104, used_percent: 40.0 },
      { storage: 'nfs-backup', type: 'nfs', used: 8796093022208, total: 10995116277760, used_percent: 80.0 },
    ],
    vms_running: 3,
    vms_total: 4,
    lxcs_running: 4,
    lxcs_total: 4,
  },
}

export const mockL3Topology: L3Topology = {
  vlans: [
    { vlan_id: 10, vlan_name: 'Management', device_count: 4 },
    { vlan_id: 20, vlan_name: 'Servers', device_count: 3 },
    { vlan_id: 100, vlan_name: 'Users', device_count: 2 },
  ],
  memberships: [
    { device_id: 'core-sw-1', librenms_device_id: 1, port_name: 'Vlan10', vlan_id: 10, vlan_name: 'Management', is_untagged: false },
    { device_id: 'core-sw-2', librenms_device_id: 2, port_name: 'Vlan10', vlan_id: 10, vlan_name: 'Management', is_untagged: false },
    { device_id: 'srv-web-1', librenms_device_id: 3, port_name: 'eth0', vlan_id: 20, vlan_name: 'Servers', is_untagged: true },
    { device_id: 'srv-db-1', librenms_device_id: 4, port_name: 'eth0', vlan_id: 20, vlan_name: 'Servers', is_untagged: true },
    { device_id: 'srv-app-1', librenms_device_id: 5, port_name: 'eth0', vlan_id: 20, vlan_name: 'Servers', is_untagged: true },
  ],
  vlan_groups: [
    {
      vlan_id: 10,
      vlan_name: 'Management',
      devices: [
        { device_id: 'core-sw-1', display_name: 'Core Switch 1', status: 'up', is_gateway: true, vlan_ids: [10, 20, 100] },
        { device_id: 'core-sw-2', display_name: 'Core Switch 2', status: 'up', is_gateway: true, vlan_ids: [10, 20, 100] },
      ],
      gateway_devices: ['core-sw-1', 'core-sw-2'],
    },
    {
      vlan_id: 20,
      vlan_name: 'Servers',
      devices: [
        { device_id: 'srv-web-1', display_name: 'Web Server', status: 'up', is_gateway: false, vlan_ids: [20] },
        { device_id: 'srv-db-1', display_name: 'Database Server', status: 'down', is_gateway: false, vlan_ids: [20] },
        { device_id: 'srv-app-1', display_name: 'App Server', status: 'up', is_gateway: false, vlan_ids: [20] },
      ],
      gateway_devices: ['core-sw-1'],
    },
  ],
  gateway_devices: ['core-sw-1', 'core-sw-2'],
}
