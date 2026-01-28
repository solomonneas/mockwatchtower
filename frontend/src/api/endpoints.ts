/**
 * API endpoints - Demo mode
 * Returns bundled mock data instead of making network requests
 */

import {
  mockTopology,
  mockAlerts,
  mockSpeedtest,
  mockVMs,
  mockL3Topology,
} from '../demo/mockData'
import type { Topology, TopologySummary } from '../types/topology'
import type { Device, DeviceSummary } from '../types/device'
import type { AlertSummary, Alert } from '../types/alert'
import type { L3Topology } from '../types/vlan'

// Proxmox types (kept inline for compatibility)
export interface ProxmoxVM {
  vmid: number
  name: string
  node: string
  instance: string
  type: 'qemu' | 'lxc'
  status: string
  cpu: number
  memory: number
  cpus: number | null
  maxmem: number | null
  uptime: number | null
  netin: number | null
  netout: number | null
}

export interface VMSummary {
  total_running: number
  total_qemu: number
  total_lxc: number
  total_cpus: number
  total_memory_gb: number
}

export interface VMListResponse {
  vms: ProxmoxVM[]
  summary: VMSummary
}

// Topology
export async function fetchTopology(): Promise<Topology> {
  return mockTopology
}

export async function fetchTopologySummary(): Promise<TopologySummary> {
  return {
    total_devices: mockTopology.total_devices,
    devices_up: mockTopology.devices_up,
    devices_down: mockTopology.devices_down,
    devices_degraded: 0,
    active_alerts: mockTopology.active_alerts,
    critical_alerts: mockAlerts.filter((a) => a.severity === 'critical').length,
    warning_alerts: mockAlerts.filter((a) => a.severity === 'warning').length,
  }
}

export async function fetchL3Topology(): Promise<L3Topology> {
  return mockL3Topology
}

// Devices
export async function fetchDevices(): Promise<DeviceSummary[]> {
  return Object.values(mockTopology.devices).map((d) => ({
    id: d.id,
    display_name: d.display_name,
    device_type: d.device_type,
    status: d.status,
    alert_count: d.alert_count,
  }))
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const device = mockTopology.devices[deviceId]
  if (!device) {
    throw new Error(`Device not found: ${deviceId}`)
  }
  return device
}

// Alerts
export async function fetchAlerts(status?: string): Promise<AlertSummary[]> {
  if (status) {
    return mockAlerts.filter((a) => a.status === status)
  }
  return mockAlerts
}

export async function fetchAlert(alertId: string): Promise<Alert> {
  const alert = mockAlerts.find((a) => a.id === alertId)
  if (!alert) {
    throw new Error(`Alert not found: ${alertId}`)
  }
  return {
    ...alert,
    details: 'Device has not responded to ICMP ping requests for over 5 minutes.',
    downtime_seconds: 342,
  }
}

export async function acknowledgeAlert(_alertId: string): Promise<void> {
  // No-op in demo mode
}

export async function resolveAlert(_alertId: string): Promise<void> {
  // No-op in demo mode
}

// Proxmox VMs
export async function fetchVMs(): Promise<VMListResponse> {
  return mockVMs
}

// Speedtest
export async function fetchSpeedtest(): Promise<typeof mockSpeedtest> {
  return mockSpeedtest
}
