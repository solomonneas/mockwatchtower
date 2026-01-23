import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useNocStore } from '../../store/nocStore'
import ClusterNode from './nodes/ClusterNode'
import DeviceNode from './nodes/DeviceNode'
import ExternalNode from './nodes/ExternalNode'
import TrafficEdge from './edges/TrafficEdge'
import type { Topology, Cluster } from '../../types/topology'

const nodeTypes = {
  cluster: ClusterNode,
  device: DeviceNode,
  external: ExternalNode,
} as const

const edgeTypes = {
  traffic: TrafficEdge,
} as const

// Calculate positions for expanded device nodes in a horizontal layout
function getExpandedDevicePositions(
  cluster: Cluster,
  deviceCount: number
): { x: number; y: number }[] {
  const spacing = 160
  const startX = cluster.position.x - ((deviceCount - 1) * spacing) / 2

  return Array.from({ length: deviceCount }, (_, i) => ({
    x: startX + i * spacing,
    y: cluster.position.y,
  }))
}

function topologyToNodes(
  topology: Topology,
  expandedClusters: Set<string>
): Node[] {
  const nodes: Node[] = []

  // Create cluster or device nodes based on expansion state
  topology.clusters.forEach((cluster) => {
    const clusterDevices = cluster.device_ids
      .map((id) => topology.devices[id])
      .filter(Boolean)

    if (expandedClusters.has(cluster.id)) {
      // Render individual device nodes
      const positions = getExpandedDevicePositions(cluster, clusterDevices.length)

      clusterDevices.forEach((device, index) => {
        nodes.push({
          id: device.id,
          type: 'device',
          position: positions[index],
          data: {
            device,
            clusterId: cluster.id,
            clusterColor: '#39d5ff',
          },
        })
      })
    } else {
      // Render collapsed cluster node
      nodes.push({
        id: cluster.id,
        type: 'cluster',
        position: { x: cluster.position.x, y: cluster.position.y },
        data: {
          cluster,
          devices: clusterDevices,
        },
      })
    }
  })

  // Create external endpoint nodes from external links
  const externalEndpoints = new Map<string, { label: string; type: string; icon: string; x: number; y: number }>()

  topology.external_links.forEach((link, index) => {
    if (!externalEndpoints.has(link.target.label)) {
      externalEndpoints.set(link.target.label, {
        label: link.target.label,
        type: link.target.type,
        icon: link.target.icon,
        x: 50,
        y: 100 + index * 120,
      })
    }

    if (link.source.label && !externalEndpoints.has(link.source.label)) {
      externalEndpoints.set(link.source.label, {
        label: link.source.label,
        type: 'campus',
        icon: 'building',
        x: 50,
        y: 100 + (index + 1) * 120,
      })
    }
  })

  externalEndpoints.forEach((endpoint, label) => {
    nodes.push({
      id: `external-${label}`,
      type: 'external',
      position: { x: endpoint.x, y: endpoint.y },
      data: {
        label: endpoint.label,
        type: endpoint.type,
        icon: endpoint.icon,
      },
    })
  })

  return nodes
}

function topologyToEdges(
  topology: Topology,
  expandedClusters: Set<string>
): Edge[] {
  const edges: Edge[] = []
  const addedEdges = new Set<string>()

  // Process all device-to-device connections
  topology.connections.forEach((conn) => {
    const sourceDevice = conn.source.device
    const targetDevice = conn.target.device

    if (sourceDevice && targetDevice) {
      const sourceCluster = topology.devices[sourceDevice]?.cluster_id
      const targetCluster = topology.devices[targetDevice]?.cluster_id

      if (!sourceCluster || !targetCluster) return

      const sourceExpanded = expandedClusters.has(sourceCluster)
      const targetExpanded = expandedClusters.has(targetCluster)

      // Determine actual source/target node IDs based on expansion state
      let actualSource: string
      let actualTarget: string

      if (sourceExpanded && targetExpanded) {
        // Both expanded: device-to-device
        actualSource = sourceDevice
        actualTarget = targetDevice
      } else if (sourceExpanded) {
        // Only source expanded: device-to-cluster
        actualSource = sourceDevice
        actualTarget = targetCluster
      } else if (targetExpanded) {
        // Only target expanded: cluster-to-device
        actualSource = sourceCluster
        actualTarget = targetDevice
      } else {
        // Neither expanded: cluster-to-cluster (aggregate)
        actualSource = sourceCluster
        actualTarget = targetCluster
      }

      // Skip self-connections (within same cluster when collapsed)
      if (actualSource === actualTarget) return

      // Create unique edge key to avoid duplicates
      const edgeKey = [actualSource, actualTarget].sort().join('--')

      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey)

        edges.push({
          id: `edge-${edgeKey}`,
          source: actualSource,
          target: actualTarget,
          type: 'traffic',
          data: {
            utilization: conn.utilization ?? 0,
            status: conn.status ?? 'up',
          },
        })
      }
    }
  })

  // Create edges for external links
  topology.external_links.forEach((link) => {
    const sourceDeviceId = link.source.device
    const sourceCluster = sourceDeviceId
      ? topology.devices[sourceDeviceId]?.cluster_id
      : null

    let sourceId: string | null

    if (sourceDeviceId && sourceCluster) {
      // If source cluster is expanded, connect to the device directly
      sourceId = expandedClusters.has(sourceCluster) ? sourceDeviceId : sourceCluster
    } else if (link.source.label) {
      sourceId = `external-${link.source.label}`
    } else {
      sourceId = null
    }

    const targetId = `external-${link.target.label}`

    if (sourceId) {
      edges.push({
        id: `edge-${link.id}`,
        source: sourceId,
        target: targetId,
        type: 'traffic',
        data: {
          utilization: link.utilization ?? 0,
          status: link.status ?? 'up',
        },
      })
    }
  })

  return edges
}

export default function TopologyCanvas() {
  const topology = useNocStore((state) => state.topology)
  const expandedClusters = useNocStore((state) => state.expandedClusters)
  const selectDevice = useNocStore((state) => state.selectDevice)
  const toggleClusterExpanded = useNocStore((state) => state.toggleClusterExpanded)

  const initialNodes = useMemo(
    () => (topology ? topologyToNodes(topology, expandedClusters) : []),
    [topology, expandedClusters]
  )

  const initialEdges = useMemo(
    () => (topology ? topologyToEdges(topology, expandedClusters) : []),
    [topology, expandedClusters]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when topology or expanded state changes
  useEffect(() => {
    if (topology) {
      setNodes(topologyToNodes(topology, expandedClusters))
      setEdges(topologyToEdges(topology, expandedClusters))
    }
  }, [topology, expandedClusters, setNodes, setEdges])

  // Single click: select device for sidebar details
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'device') {
        selectDevice(node.id)
      }
    },
    [selectDevice]
  )

  // Double click: toggle expand/collapse
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'cluster') {
        toggleClusterExpanded(node.id)
      } else if (node.type === 'device') {
        // Collapse parent cluster
        const clusterId = (node.data as { clusterId?: string }).clusterId
        if (clusterId) {
          toggleClusterExpanded(clusterId)
        }
      }
    },
    [toggleClusterExpanded]
  )

  if (!topology) {
    return null
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'traffic',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#30363d" gap={20} size={1} />
        <Controls
          className="!bg-bg-secondary !border-border-default !rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-bg-secondary !border-border-default"
          nodeColor={(node) => {
            if (node.type === 'external') return '#6e7681'
            if (node.type === 'device') return '#58a6ff'
            return '#39d5ff'
          }}
          maskColor="rgba(13, 17, 23, 0.8)"
        />
      </ReactFlow>
    </div>
  )
}
