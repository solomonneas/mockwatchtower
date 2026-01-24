import { useState, useMemo } from 'react'
import { useNocStore } from '../../store/nocStore'
import type { Connection, ExternalLink, ConnectionType } from '../../types/connection'

// Speed formatting helper
function formatSpeed(speedMbps: number): string {
  if (speedMbps >= 10000) return `${speedMbps / 1000}G`
  if (speedMbps >= 1000) return `${speedMbps / 1000}G`
  return `${speedMbps}M`
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    up: 'bg-green-500/20 text-green-400 border-green-500/30',
    down: 'bg-red-500/20 text-red-400 border-red-500/30',
    degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded border ${colors[status] || colors.unknown}`}>
      {status.toUpperCase()}
    </span>
  )
}

// Link type badge
function TypeBadge({ type }: { type: ConnectionType }) {
  const colors: Record<ConnectionType, string> = {
    trunk: 'bg-blue-500/20 text-blue-400',
    access: 'bg-purple-500/20 text-purple-400',
    uplink: 'bg-cyan-500/20 text-cyan-400',
    stack: 'bg-orange-500/20 text-orange-400',
    wan: 'bg-pink-500/20 text-pink-400',
  }

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${colors[type] || 'bg-gray-500/20 text-gray-400'}`}>
      {type}
    </span>
  )
}

// Single link row component
function LinkRow({
  connection,
  isExpanded,
  onToggle
}: {
  connection: Connection
  isExpanded: boolean
  onToggle: () => void
}) {
  const sourceLabel = connection.source.device
    ? `${connection.source.device}:${connection.source.port || '?'}`
    : connection.source.label || '?'
  const targetLabel = connection.target.device
    ? `${connection.target.device}:${connection.target.port || '?'}`
    : connection.target.label || '?'

  return (
    <div className="border-b border-border-primary last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-primary font-mono truncate">{sourceLabel}</span>
              <span className="text-text-tertiary">{'<-->'}</span>
              <span className="text-text-primary font-mono truncate">{targetLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-secondary">{formatSpeed(connection.speed)}</span>
            <StatusBadge status={connection.status} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 bg-bg-tertiary/50 border-t border-border-primary">
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <div>
              <span className="text-text-tertiary">Type:</span>
              <span className="ml-2"><TypeBadge type={connection.connection_type} /></span>
            </div>
            <div>
              <span className="text-text-tertiary">Speed:</span>
              <span className="ml-2 text-text-primary">{formatSpeed(connection.speed)}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Utilization:</span>
              <span className="ml-2 text-text-primary">{connection.utilization.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-text-tertiary">Errors:</span>
              <span className={`ml-2 ${connection.errors > 0 ? 'text-red-400' : 'text-text-primary'}`}>
                {connection.errors}
              </span>
            </div>
            {connection.description && (
              <div className="col-span-2">
                <span className="text-text-tertiary">Description:</span>
                <span className="ml-2 text-text-primary">{connection.description}</span>
              </div>
            )}
            {connection.provider && (
              <div className="col-span-2">
                <span className="text-text-tertiary">Provider:</span>
                <span className="ml-2 text-text-primary">{connection.provider}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// External link row
function ExternalLinkRow({
  link,
  isExpanded,
  onToggle
}: {
  link: ExternalLink
  isExpanded: boolean
  onToggle: () => void
}) {
  const sourceLabel = link.source.device
    ? `${link.source.device}:${link.source.port || '?'}`
    : link.source.label || '?'

  return (
    <div className="border-b border-border-primary last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-primary font-mono truncate">{sourceLabel}</span>
              <span className="text-text-tertiary">{'-->'}</span>
              <span className="text-cyan-400 truncate">{link.target.label}</span>
              <span className="text-text-tertiary text-xs">({link.target.type})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-secondary">{formatSpeed(link.speed)}</span>
            <StatusBadge status={link.status} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 bg-bg-tertiary/50 border-t border-border-primary">
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <div>
              <span className="text-text-tertiary">Speed:</span>
              <span className="ml-2 text-text-primary">{formatSpeed(link.speed)}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Utilization:</span>
              <span className="ml-2 text-text-primary">{link.utilization.toFixed(1)}%</span>
            </div>
            {link.provider && (
              <div>
                <span className="text-text-tertiary">Provider:</span>
                <span className="ml-2 text-text-primary">{link.provider}</span>
              </div>
            )}
            {link.circuit_id && (
              <div>
                <span className="text-text-tertiary">Circuit:</span>
                <span className="ml-2 text-text-primary">{link.circuit_id}</span>
              </div>
            )}
            {link.description && (
              <div className="col-span-2">
                <span className="text-text-tertiary">Description:</span>
                <span className="ml-2 text-text-primary">{link.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Link category section
function LinkCategory({
  title,
  count,
  children,
  defaultExpanded = true
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-border-primary rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 bg-bg-tertiary flex items-center justify-between hover:bg-bg-tertiary/80 transition-colors"
      >
        <span className="font-medium text-text-primary">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded">
            {count}
          </span>
          <svg
            className={`w-4 h-4 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && <div className="bg-bg-secondary">{children}</div>}
    </div>
  )
}

export default function PhysicalLinksPanel() {
  const { topology } = useNocStore()
  const [expandedLink, setExpandedLink] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all')

  // Group connections by type
  const groupedLinks = useMemo(() => {
    if (!topology) return { firewall: [], core: [], server: [], ha: [], external: [] }

    const connections = topology.connections || []
    const externalLinks = topology.external_links || []

    // Filter by status
    const filteredConnections = filter === 'all'
      ? connections
      : connections.filter(c => filter === 'up' ? c.status === 'up' : c.status === 'down')

    const filteredExternal = filter === 'all'
      ? externalLinks
      : externalLinks.filter(l => filter === 'up' ? l.status === 'up' : l.status === 'down')

    // Categorize connections
    const firewall: Connection[] = []
    const core: Connection[] = []
    const server: Connection[] = []
    const ha: Connection[] = []

    filteredConnections.forEach(conn => {
      const srcDev = conn.source.device?.toLowerCase() || ''
      const tgtDev = conn.target.device?.toLowerCase() || ''

      if (conn.connection_type === 'stack') {
        ha.push(conn)
      } else if (srcDev.includes('fw') || srcDev.includes('pa3410') || tgtDev.includes('fw') || tgtDev.includes('pa3410')) {
        if (!ha.includes(conn)) firewall.push(conn)
      } else if (srcDev.includes('s0-') || srcDev.includes('s0_') || tgtDev.includes('s0-') || tgtDev.includes('s0_')) {
        if (srcDev.includes('host') || tgtDev.includes('host') || srcDev.includes('proxmox') || tgtDev.includes('proxmox') || srcDev.includes('hyperv') || tgtDev.includes('hyperv')) {
          server.push(conn)
        } else {
          core.push(conn)
        }
      } else {
        server.push(conn)
      }
    })

    return {
      firewall,
      core,
      server,
      ha,
      external: filteredExternal,
    }
  }, [topology, filter])

  const totalLinks = useMemo(() => {
    const conns = topology?.connections?.length || 0
    const ext = topology?.external_links?.length || 0
    return conns + ext
  }, [topology])

  const upLinks = useMemo(() => {
    const connsUp = topology?.connections?.filter(c => c.status === 'up').length || 0
    const extUp = topology?.external_links?.filter(l => l.status === 'up').length || 0
    return connsUp + extUp
  }, [topology])

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-primary">
        <h2 className="text-lg font-semibold text-text-primary">Physical Links</h2>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-text-secondary">{totalLinks} total</span>
          <span className="text-green-400">{upLinks} up</span>
          <span className="text-red-400">{totalLinks - upLinks} down</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-border-primary flex gap-2">
        {(['all', 'up', 'down'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filter === f
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Link categories */}
      <div className="flex-1 overflow-y-auto p-3">
        {groupedLinks.firewall.length > 0 && (
          <LinkCategory title="Firewall Links" count={groupedLinks.firewall.length}>
            {groupedLinks.firewall.map((conn) => (
              <LinkRow
                key={conn.id}
                connection={conn}
                isExpanded={expandedLink === conn.id}
                onToggle={() => setExpandedLink(expandedLink === conn.id ? null : conn.id)}
              />
            ))}
          </LinkCategory>
        )}

        {groupedLinks.ha.length > 0 && (
          <LinkCategory title="HA / Stack Links" count={groupedLinks.ha.length}>
            {groupedLinks.ha.map((conn) => (
              <LinkRow
                key={conn.id}
                connection={conn}
                isExpanded={expandedLink === conn.id}
                onToggle={() => setExpandedLink(expandedLink === conn.id ? null : conn.id)}
              />
            ))}
          </LinkCategory>
        )}

        {groupedLinks.core.length > 0 && (
          <LinkCategory title="Core Interconnects" count={groupedLinks.core.length}>
            {groupedLinks.core.map((conn) => (
              <LinkRow
                key={conn.id}
                connection={conn}
                isExpanded={expandedLink === conn.id}
                onToggle={() => setExpandedLink(expandedLink === conn.id ? null : conn.id)}
              />
            ))}
          </LinkCategory>
        )}

        {groupedLinks.server.length > 0 && (
          <LinkCategory title="Server Links" count={groupedLinks.server.length} defaultExpanded={false}>
            {groupedLinks.server.map((conn) => (
              <LinkRow
                key={conn.id}
                connection={conn}
                isExpanded={expandedLink === conn.id}
                onToggle={() => setExpandedLink(expandedLink === conn.id ? null : conn.id)}
              />
            ))}
          </LinkCategory>
        )}

        {groupedLinks.external.length > 0 && (
          <LinkCategory title="External / WAN" count={groupedLinks.external.length}>
            {groupedLinks.external.map((link) => (
              <ExternalLinkRow
                key={link.id}
                link={link}
                isExpanded={expandedLink === link.id}
                onToggle={() => setExpandedLink(expandedLink === link.id ? null : link.id)}
              />
            ))}
          </LinkCategory>
        )}

        {totalLinks === 0 && (
          <div className="text-center text-text-secondary py-8">
            No physical links configured
          </div>
        )}
      </div>
    </div>
  )
}
