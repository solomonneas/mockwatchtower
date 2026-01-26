/**
 * ProxmoxPanel Component
 *
 * Homarr-style Proxmox node detail panel showing:
 * - Node info with CPU/RAM
 * - VMs list with CPU/RAM per VM
 * - LXCs list with CPU/RAM per container
 * - Storage with usage bars
 */

import { useState, useEffect } from 'react'

interface NodeInfo {
  node: string
  status: string
  cpu: number
  memory: number
  maxcpu: number
  maxmem: number
  uptime: number
}

interface VMInfo {
  vmid: number
  name: string
  type: string
  status: string
  cpu: number
  memory: number
}

interface StorageInfo {
  storage: string
  type: string
  used: number
  total: number
  used_percent: number
}

interface ProxmoxNodeDetail {
  node: NodeInfo | null
  vms: VMInfo[]
  lxcs: VMInfo[]
  storage: StorageInfo[]
  vms_running: number
  vms_total: number
  lxcs_running: number
  lxcs_total: number
}

interface ProxmoxPanelProps {
  nodeName: string
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function ProxmoxPanel({ nodeName }: ProxmoxPanelProps) {
  const [data, setData] = useState<ProxmoxNodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/vms/node/${encodeURIComponent(nodeName)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch node data')
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [nodeName])

  if (loading && !data) {
    return (
      <div className="proxmox-panel">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="proxmox-panel">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="proxmox-panel">
      {/* Node Section */}
      {data.node && (
        <Section
          title="Node"
          count={1}
          total={1}
          icon={<ServerIcon />}
        >
          <ResourceRow
            name={data.node.node}
            cpu={data.node.cpu}
            memory={data.node.memory}
            status={data.node.status}
          />
        </Section>
      )}

      {/* VMs Section */}
      {data.vms.length > 0 && (
        <Section
          title="VMs"
          count={data.vms_running}
          total={data.vms_total}
          icon={<VMIcon />}
        >
          {data.vms.map((vm) => (
            <ResourceRow
              key={`vm-${vm.vmid}`}
              name={vm.name}
              cpu={vm.cpu}
              memory={vm.memory}
              status={vm.status}
            />
          ))}
        </Section>
      )}

      {/* LXCs Section */}
      {data.lxcs.length > 0 && (
        <Section
          title="LXCs"
          count={data.lxcs_running}
          total={data.lxcs_total}
          icon={<ContainerIcon />}
        >
          {data.lxcs.map((lxc) => (
            <ResourceRow
              key={`lxc-${lxc.vmid}`}
              name={lxc.name}
              cpu={lxc.cpu}
              memory={lxc.memory}
              status={lxc.status}
            />
          ))}
        </Section>
      )}

      {/* Storage Section */}
      {data.storage.length > 0 && (
        <Section
          title="Storage"
          count={data.storage.length}
          total={data.storage.length}
          icon={<StorageIcon />}
        >
          {data.storage.map((storage) => (
            <StorageRow
              key={storage.storage}
              name={storage.storage}
              type={storage.type}
              used={storage.used}
              total={storage.total}
              usedPercent={storage.used_percent}
            />
          ))}
        </Section>
      )}

      <style>{`
        .proxmox-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .loading-spinner,
        .error-message {
          padding: 20px;
          text-align: center;
          color: #888;
          font-size: 13px;
        }

        .error-message {
          color: #ef4444;
        }

        .section {
          background: #111;
          border-radius: 8px;
          border: 1px solid #222;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
          border-bottom: 1px solid #222;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #ccc;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-icon {
          width: 16px;
          height: 16px;
          color: #666;
        }

        .section-count {
          font-size: 11px;
          color: #666;
          background: #1a1a1a;
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid #333;
        }

        .section-content {
          padding: 0;
        }

        .resource-row {
          display: grid;
          grid-template-columns: 1fr 60px 60px;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #1a1a1a;
          transition: background 0.15s;
        }

        .resource-row:last-child {
          border-bottom: none;
        }

        .resource-row:hover {
          background: #1a1a1a;
        }

        .resource-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #ddd;
          overflow: hidden;
        }

        .resource-name-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-running {
          background: #22c55e;
          box-shadow: 0 0 4px #22c55e;
        }

        .status-stopped {
          background: #666;
        }

        .status-online {
          background: #22c55e;
          box-shadow: 0 0 4px #22c55e;
        }

        .resource-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          text-align: right;
        }

        .cpu-value {
          color: #60a5fa;
        }

        .ram-value {
          color: #a78bfa;
        }

        .column-header {
          display: grid;
          grid-template-columns: 1fr 60px 60px;
          padding: 6px 12px;
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #1a1a1a;
        }

        .column-header span:not(:first-child) {
          text-align: right;
        }

        .storage-row {
          display: flex;
          flex-direction: column;
          padding: 10px 12px;
          border-bottom: 1px solid #1a1a1a;
          gap: 6px;
        }

        .storage-row:last-child {
          border-bottom: none;
        }

        .storage-row:hover {
          background: #1a1a1a;
        }

        .storage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .storage-name {
          font-size: 13px;
          color: #ddd;
        }

        .storage-type {
          font-size: 10px;
          color: #555;
          background: #1a1a1a;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .storage-bar {
          height: 6px;
          background: #222;
          border-radius: 3px;
          overflow: hidden;
        }

        .storage-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .storage-bar-normal {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
        }

        .storage-bar-warning {
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
        }

        .storage-bar-critical {
          background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
        }

        .storage-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #666;
        }

        .storage-percent {
          color: #888;
        }
      `}</style>
    </div>
  )
}

// Section component
function Section({
  title,
  count,
  total,
  icon,
  children,
}: {
  title: string
  count: number
  total: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">{icon}</span>
          <span>{title}</span>
        </div>
        <span className="section-count">{count} / {total}</span>
      </div>
      <div className="section-content">
        {title !== 'Storage' && (
          <div className="column-header">
            <span>Name</span>
            <span>CPU</span>
            <span>RAM</span>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// Resource row (VMs, LXCs, Node)
function ResourceRow({
  name,
  cpu,
  memory,
  status,
}: {
  name: string
  cpu: number
  memory: number
  status: string
}) {
  return (
    <div className="resource-row">
      <div className="resource-name">
        <span className={`status-dot status-${status}`} />
        <span className="resource-name-text" title={name}>{name}</span>
      </div>
      <span className="resource-value cpu-value">{cpu.toFixed(1)}%</span>
      <span className="resource-value ram-value">{memory.toFixed(1)}%</span>
    </div>
  )
}

// Storage row
function StorageRow({
  name,
  type,
  used,
  total,
  usedPercent,
}: {
  name: string
  type: string
  used: number
  total: number
  usedPercent: number
}) {
  const barClass = usedPercent >= 90 ? 'critical' : usedPercent >= 70 ? 'warning' : 'normal'

  return (
    <div className="storage-row">
      <div className="storage-header">
        <span className="storage-name">{name}</span>
        <span className="storage-type">{type}</span>
      </div>
      <div className="storage-bar">
        <div
          className={`storage-bar-fill storage-bar-${barClass}`}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>
      <div className="storage-info">
        <span>{formatBytes(used)} / {formatBytes(total)}</span>
        <span className="storage-percent">{usedPercent.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// Icons
function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="6" rx="1" />
      <rect x="2" y="15" width="20" height="6" rx="1" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function VMIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M7 20h10" />
      <path d="M9 16v4" />
      <path d="M15 16v4" />
    </svg>
  )
}

function ContainerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  )
}

function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}
