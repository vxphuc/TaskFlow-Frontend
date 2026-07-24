import { useSyncExternalStore } from 'react'
import {
  getRealtimeStatus,
  subscribeRealtimeStatus,
} from '../realtime/realtimeClient'

export function useRealtimeStatus() {
  return useSyncExternalStore(
    subscribeRealtimeStatus,
    getRealtimeStatus,
    getRealtimeStatus,
  )
}
