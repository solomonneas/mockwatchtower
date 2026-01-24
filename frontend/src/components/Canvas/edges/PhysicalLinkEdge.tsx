import { memo, useState } from 'react'
import { getBezierPath, EdgeLabelRenderer, type Position } from '@xyflow/react'

interface PhysicalLinkEdgeData {
  sourcePort?: string
  targetPort?: string
  speed?: number  // Mbps
  utilization: number
  status: string
  connectionType?: string
  description?: string
}

interface PhysicalLinkEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  data?: PhysicalLinkEdgeData
  selected?: boolean
}

function getEdgeColor(utilization: number, status: string): string {
  if (status === 'down') return '#f85149'
  if (status === 'degraded') return '#d29922'
  if (status === 'unknown') return '#6e7681'

  // High utilization warnings
  if (utilization >= 85) return '#f85149'  // Red - critical
  if (utilization >= 60) return '#d29922'  // Yellow - warning

  // Active links get bright blue
  return '#58a6ff'
}

function getEdgeWidth(speed: number = 1000, utilization: number): number {
  // Base width by speed
  let baseWidth = 2
  if (speed >= 10000) baseWidth = 4  // 10G
  else if (speed >= 1000) baseWidth = 3  // 1G

  // Add width for high utilization
  if (utilization >= 60) baseWidth += 1

  return baseWidth
}

function formatSpeed(speedMbps: number): string {
  if (speedMbps >= 10000) return `${speedMbps / 1000}G`
  if (speedMbps >= 1000) return `${speedMbps / 1000}G`
  return `${speedMbps}M`
}

function PhysicalLinkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: PhysicalLinkEdgeProps) {
  const [hovered, setHovered] = useState(false)

  const utilization = data?.utilization ?? 0
  const status = data?.status ?? 'up'
  const speed = data?.speed ?? 1000
  const sourcePort = data?.sourcePort
  const targetPort = data?.targetPort
  const connectionType = data?.connectionType

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const strokeColor = getEdgeColor(utilization, status)
  const strokeWidth = getEdgeWidth(speed, utilization)

  // Calculate port label positions (near the connection points)
  const sourcePortX = sourceX + (targetX - sourceX) * 0.15
  const sourcePortY = sourceY + (targetY - sourceY) * 0.15
  const targetPortX = sourceX + (targetX - sourceX) * 0.85
  const targetPortY = sourceY + (targetY - sourceY) * 0.85

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? '#39d5ff' : strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={status === 'up' ? 'animate-flow' : ''}
        style={{
          strokeDasharray: status === 'up' ? '8,4' : status === 'down' ? '5,5' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Edge labels rendered in HTML layer */}
      <EdgeLabelRenderer>
        {/* Port labels - always show on hover or select */}
        {(hovered || selected) && sourcePort && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourcePortX}px, ${sourcePortY}px)`,
              pointerEvents: 'none',
            }}
            className="text-xs bg-bg-secondary/90 text-text-secondary px-1.5 py-0.5 rounded border border-border-primary font-mono"
          >
            {sourcePort}
          </div>
        )}

        {(hovered || selected) && targetPort && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetPortX}px, ${targetPortY}px)`,
              pointerEvents: 'none',
            }}
            className="text-xs bg-bg-secondary/90 text-text-secondary px-1.5 py-0.5 rounded border border-border-primary font-mono"
          >
            {targetPort}
          </div>
        )}

        {/* Center label with speed and utilization */}
        {(hovered || selected || utilization >= 60) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-xs bg-bg-secondary/95 text-text-primary px-2 py-1 rounded border border-border-primary shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">{formatSpeed(speed)}</span>
              <span className={`font-medium ${utilization >= 85 ? 'text-red-400' : utilization >= 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                {utilization.toFixed(0)}%
              </span>
              {connectionType && (
                <span className="text-text-tertiary text-xs">({connectionType})</span>
              )}
            </div>
          </div>
        )}

        {/* Down indicator */}
        {status === 'down' && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-medium">DOWN</span>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(PhysicalLinkEdge)
