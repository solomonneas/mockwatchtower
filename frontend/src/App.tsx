import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Layout from './components/Layout/Layout'
import ToastContainer from './components/Alerts/ToastContainer'
import CriticalOverlay from './components/Alerts/CriticalOverlay'
import { useNocStore } from './store/nocStore'
import { useWebSocket } from './hooks/useWebSocket'
import { fetchTopology } from './api/endpoints'

// Debug helper - expose store methods to window for testing
// Usage in browser console:
//   window.watchtower.setDeviceDown('s0-1305')
//   window.watchtower.setDeviceUp('s0-1305')
//   window.watchtower.listDevices()
//   window.watchtower.setSpeedtestDown()    // Turn external links red
//   window.watchtower.setSpeedtestNormal()  // Turn external links green
if (typeof window !== 'undefined') {
  (window as unknown as { watchtower: unknown }).watchtower = {
    setDeviceDown: (deviceId: string) => {
      useNocStore.getState().updateDeviceStatus(deviceId, 'down')
      console.log(`Set ${deviceId} to DOWN`)
    },
    setDeviceUp: (deviceId: string) => {
      useNocStore.getState().updateDeviceStatus(deviceId, 'up')
      console.log(`Set ${deviceId} to UP`)
    },
    listDevices: () => {
      const topology = useNocStore.getState().topology
      if (topology) {
        Object.entries(topology.devices).forEach(([id, dev]) => {
          console.log(`${id}: ${dev.status}`)
        })
      }
    },
    getStore: () => useNocStore.getState(),
    setSpeedtestDown: () => {
      useNocStore.getState().setSpeedtestStatus('down')
      console.log('Speedtest status: DOWN (external links now red)')
    },
    setSpeedtestDegraded: () => {
      useNocStore.getState().setSpeedtestStatus('degraded')
      console.log('Speedtest status: DEGRADED (external links now yellow)')
    },
    setSpeedtestNormal: () => {
      useNocStore.getState().setSpeedtestStatus('normal')
      console.log('Speedtest status: NORMAL (external links now green)')
    },
  }
}

function App() {
  const setTopology = useNocStore((state) => state.setTopology)
  const setLoading = useNocStore((state) => state.setLoading)
  const setError = useNocStore((state) => state.setError)
  const setSpeedtestStatus = useNocStore((state) => state.setSpeedtestStatus)

  // Connect to WebSocket for real-time updates
  useWebSocket()

  useEffect(() => {
    async function loadTopology() {
      setLoading(true)
      try {
        const topology = await fetchTopology()
        setTopology(topology)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load topology')
      } finally {
        setLoading(false)
      }
    }

    loadTopology()

    // Refresh topology every 60 seconds
    const interval = setInterval(loadTopology, 60000)
    return () => clearInterval(interval)
  }, [setTopology, setLoading, setError])

  // Fetch initial speedtest status for external link coloring
  useEffect(() => {
    async function loadSpeedtest() {
      try {
        const response = await fetch('/api/speedtest')
        const data = await response.json()
        if (data.indicator) {
          setSpeedtestStatus(data.indicator)
        }
      } catch {
        // Ignore - speedtest data is optional
      }
    }
    loadSpeedtest()
  }, [setSpeedtestStatus])

  return (
    <ReactFlowProvider>
      <Layout />
      <ToastContainer />
      <CriticalOverlay />
    </ReactFlowProvider>
  )
}

export default App
