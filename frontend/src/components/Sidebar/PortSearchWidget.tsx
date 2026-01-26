import { useState, useCallback } from 'react'

interface PortSearchResult {
  port_id: number | null
  device_id: number | null
  device_hostname: string | null
  ifName: string | null
  ifAlias: string | null
  ifDescr: string | null
  ifSpeed: number | null
  ifOperStatus: string | null
  ifAdminStatus: string | null
  in_mbps: number | null
  out_mbps: number | null
}

interface SearchResponse {
  query: string
  total: number
  ports: PortSearchResult[]
}

type WidgetState = 'idle' | 'loading' | 'results' | 'error'

export default function PortSearchWidget() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [state, setState] = useState<WidgetState>('idle')
  const [expanded, setExpanded] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setState('loading')
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        status: statusFilter,
        limit: '100',
      })
      const response = await fetch(`/api/ports/search?${params}`)
      if (!response.ok) throw new Error('Search failed')

      const data: SearchResponse = await response.json()
      setResults(data)
      setState('results')
      setExpanded(true)
    } catch (err) {
      console.error('Port search failed:', err)
      setState('error')
    }
  }, [query, statusFilter])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setState('idle')
  }

  const formatSpeed = (bps: number | null): string => {
    if (!bps) return '-'
    if (bps >= 10_000_000_000) return `${bps / 1_000_000_000}G`
    if (bps >= 1_000_000_000) return '1G'
    if (bps >= 100_000_000) return '100M'
    if (bps >= 10_000_000) return '10M'
    return `${bps / 1_000_000}M`
  }

  return (
    <div className="p-4 border-b border-border-primary">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <SearchIcon />
          <h3 className="text-sm font-semibold text-text-primary">Port Search</h3>
        </div>
        <ChevronIcon expanded={expanded} />
      </div>

      {/* Collapsible content */}
      {expanded && (
        <div className="mt-3">
          {/* Search input */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="printer, WAP, camera..."
                className="w-full px-3 py-1.5 text-sm bg-bg-tertiary border border-border-primary rounded-lg
                  text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  <XIcon />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || state === 'loading'}
              className="px-3 py-1.5 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state === 'loading' ? '...' : 'Search'}
            </button>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 mb-3">
            {['all', 'up', 'down'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  statusFilter === s
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {s === 'all' ? 'All' : s === 'up' ? 'Up' : 'Down'}
              </button>
            ))}
          </div>

          {/* Results */}
          {state === 'error' && (
            <div className="text-sm text-status-red text-center py-2">
              Search failed. Try again.
            </div>
          )}

          {state === 'results' && results && (
            <div>
              <div className="text-xs text-text-muted mb-2">
                Found {results.total} port{results.total !== 1 ? 's' : ''} matching "{results.query}"
              </div>

              {results.total === 0 ? (
                <div className="text-sm text-text-tertiary text-center py-4">
                  No ports found
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {results.ports.map((port, idx) => (
                    <div
                      key={`${port.device_id}-${port.port_id}-${idx}`}
                      className="p-2 bg-bg-tertiary rounded-lg text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-text-primary">
                          {port.device_hostname || 'Unknown'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            port.ifOperStatus === 'up'
                              ? 'bg-status-green/20 text-status-green'
                              : 'bg-status-red/20 text-status-red'
                          }`}
                        >
                          {port.ifOperStatus || '?'}
                        </span>
                      </div>
                      <div className="text-text-secondary">
                        <span className="font-mono">{port.ifName}</span>
                        {port.ifSpeed && (
                          <span className="ml-2 text-text-tertiary">
                            {formatSpeed(port.ifSpeed)}
                          </span>
                        )}
                      </div>
                      {port.ifAlias && (
                        <div className="text-text-muted mt-1 truncate" title={port.ifAlias}>
                          {port.ifAlias}
                        </div>
                      )}
                      {port.ifOperStatus === 'up' && (port.in_mbps || port.out_mbps) && (
                        <div className="flex gap-3 mt-1 text-text-tertiary">
                          <span>
                            <DownArrow /> {port.in_mbps?.toFixed(2) || 0} Mbps
                          </span>
                          <span>
                            <UpArrow /> {port.out_mbps?.toFixed(2) || 0} Mbps
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {state === 'idle' && (
            <div className="text-xs text-text-tertiary text-center py-2">
              Search by port description (ifAlias)
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function DownArrow() {
  return (
    <svg className="w-3 h-3 inline text-status-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
}

function UpArrow() {
  return (
    <svg className="w-3 h-3 inline text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  )
}
