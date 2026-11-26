import { describe, expect, it, vi } from 'vitest'

import { SelectNodeEvent } from '../../events'
import { useWorkspaceEffect } from '../useWorkspaceEffect'

const createHarness = () => {
  const workspaces: any[] = []
  const handlers = new Map<any, (event: any) => void>()
  const engine: any = {
    workbench: {
      setActiveWorkspace: vi.fn(),
      eachWorkspace: vi.fn((visitor: (workspace: any) => void) => workspaces.forEach(visitor)),
    },
    subscribeWith: vi.fn((_types: string[], handler: (event: any) => void) => {
      handlers.set('multi', handler)
    }),
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  const createWorkspace = () => ({ operation: { selection: { clear: vi.fn() } } })
  useWorkspaceEffect(engine)
  return { engine, handlers, workspaces, createWorkspace }
}

describe('useWorkspaceEffect', () => {
  it('节点变更事件激活事件上下文中的工作区', () => {
    const { engine, handlers } = createHarness()
    const workspace = { id: 'w1' }
    const handler = handlers.get('multi')!

    handler({ context: { workbench: engine.workbench, workspace } })
    expect(engine.workbench.setActiveWorkspace).toHaveBeenCalledWith(workspace)

    handler({ context: {} })
    expect(engine.workbench.setActiveWorkspace).toHaveBeenCalledTimes(1)

    handler({})
    expect(engine.workbench.setActiveWorkspace).toHaveBeenCalledTimes(1)
  })

  it('选中节点时清空其他工作区的选择', () => {
    const { handlers, workspaces, createWorkspace } = createHarness()
    const current = createWorkspace()
    const other = createWorkspace()
    workspaces.push(current, other)

    handlers.get(SelectNodeEvent)!({ context: { workspace: current } })

    expect(current.operation.selection.clear).not.toHaveBeenCalled()
    expect(other.operation.selection.clear).toHaveBeenCalledTimes(1)
  })
})
