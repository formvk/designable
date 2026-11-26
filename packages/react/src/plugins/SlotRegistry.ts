import type { IDesignerSlotEntry, IDesignerSlotRegistry } from './types'

type AnyEntry = IDesignerSlotEntry<any>

/**
 * 命名槽位注册表。快照按槽位名缓存，保证 useSyncExternalStore 快照稳定。
 */
export const createSlotRegistry = (): IDesignerSlotRegistry => {
  const groups = new Map<string, Map<string, AnyEntry>>()
  const snapshots = new Map<string, AnyEntry[]>()
  const listeners = new Set<() => void>()

  const emit = () => {
    snapshots.clear()
    listeners.forEach(listener => listener())
  }

  return {
    register<P extends object>(name: string, entry: IDesignerSlotEntry<P>) {
      const stored = entry as AnyEntry
      const group = groups.get(name) ?? new Map<string, AnyEntry>()
      groups.set(name, group)
      group.set(stored.id, stored)
      emit()
      return () => {
        if (group.get(stored.id) !== stored) return
        group.delete(stored.id)
        emit()
      }
    },
    get(name) {
      let snapshot = snapshots.get(name)
      if (!snapshot) {
        snapshot = [...(groups.get(name)?.values() ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        snapshots.set(name, snapshot)
      }
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
