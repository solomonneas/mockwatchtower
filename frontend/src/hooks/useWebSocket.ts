import { useEffect } from 'react'
import { useNocStore } from '../store/nocStore'

/**
 * WebSocket hook - Demo mode
 * Returns a fake "connected" state without establishing real connections
 */
export function useWebSocket() {
  const setConnected = useNocStore((state) => state.setConnected)

  useEffect(() => {
    // Mark as connected immediately in demo mode
    setConnected(true)
  }, [setConnected])

  return {
    isConnected: true,
    connect: () => {},
    disconnect: () => {},
  }
}
