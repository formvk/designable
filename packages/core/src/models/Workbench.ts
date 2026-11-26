import { action, shallow, shallowRef } from '@formvk/reactive'

import { AddWorkspaceEvent, RemoveWorkspaceEvent, SwitchWorkspaceEvent } from '../events'
import type { IEngineContext, WorkbenchTypes } from '../types'
import type { Engine } from './Engine'
import { DESIGNER_PIPELINES } from './Pipeline'
import type { IWorkbenchContext, MaybePromise } from './Pipeline'
import type { IWorkspaceProps } from './Workspace'
import { Workspace } from './Workspace'
export class Workbench {
  @shallow accessor workspaces: Workspace[]

  @shallowRef accessor currentWorkspace: Workspace | undefined

  @shallowRef accessor activeWorkspace: Workspace | undefined

  engine: Engine

  @shallowRef accessor type: WorkbenchTypes = 'DESIGNABLE'

  /**
   * 工作台动作串行队列：switchWorkspace / setWorkbenchType 按调用顺序落地，
   * 避免慢中间件在途时并发切换造成 currentWorkspace / type 乱序。
   */
  private actionTail: Promise<unknown> = Promise.resolve()

  constructor(engine: Engine) {
    this.engine = engine
    this.workspaces = []
    this.currentWorkspace = undefined
    this.activeWorkspace = undefined
  }

  private enqueueAction<T>(task: () => MaybePromise<T>): Promise<T> {
    const result = this.actionTail.then(task, task)
    this.actionTail = result.catch(() => {})
    return result
  }

  getEventContext(): IEngineContext {
    return {
      engine: this.engine,
      workbench: this.engine.workbench,
    }
  }

  @action
  switchWorkspace(id: string): Promise<Workspace | undefined> {
    return this.enqueueAction(() => this.executeSwitchWorkspace(id))
  }

  private async executeSwitchWorkspace(id: string): Promise<Workspace | undefined> {
    const pipeline = this.engine?.pipeline
    if (pipeline) {
      const context: IWorkbenchContext = {
        engine: this.engine,
        workbench: this,
        action: 'switch',
        from: this.currentWorkspace,
        id,
        to: id,
      }
      await pipeline.run(DESIGNER_PIPELINES.workbench, context, () => {
        this.applyWorkspaceSwitch(context.to ?? id)
      })
    } else {
      this.applyWorkspaceSwitch(id)
    }
    return this.currentWorkspace
  }

  private applyWorkspaceSwitch(target: string | Workspace) {
    const finded = typeof target === 'string' ? this.findWorkspaceById(target) : target
    if (finded) {
      this.currentWorkspace = finded
      this.engine.dispatch(new SwitchWorkspaceEvent(finded))
    }
    return this.currentWorkspace
  }

  @action
  setActiveWorkspace(workspace?: Workspace) {
    this.activeWorkspace = workspace
    return workspace
  }

  @action
  setWorkbenchType(type: WorkbenchTypes): Promise<void> {
    return this.enqueueAction(() => this.executeSetWorkbenchType(type))
  }

  private async executeSetWorkbenchType(type: WorkbenchTypes): Promise<void> {
    const pipeline = this.engine?.pipeline
    if (pipeline) {
      const context: IWorkbenchContext = {
        engine: this.engine,
        workbench: this,
        action: 'type',
        from: this.currentWorkspace,
        type,
      }
      await pipeline.run(DESIGNER_PIPELINES.workbench, context, () => {
        this.type = context.type ?? type
      })
      return
    }
    this.type = type
  }

  @action
  addWorkspace(props: IWorkspaceProps) {
    const finded = this.findWorkspaceById(props.id)
    if (!finded) {
      this.currentWorkspace = new Workspace(this.engine, props)
      this.workspaces.push(this.currentWorkspace)
      this.engine.dispatch(new AddWorkspaceEvent(this.currentWorkspace))
      return this.currentWorkspace
    }
    return finded
  }

  @action
  removeWorkspace(id: string) {
    const findIndex = this.findWorkspaceIndexById(id)
    if (findIndex > -1 && findIndex < this.workspaces.length) {
      const findedWorkspace = this.workspaces[findIndex]
      findedWorkspace.viewport.detachEvents()
      this.workspaces.splice(findIndex, 1)
      if (findedWorkspace === this.currentWorkspace) {
        if (this.workspaces.length && this.workspaces[findIndex]) {
          this.currentWorkspace = this.workspaces[findIndex]
        } else {
          this.currentWorkspace = this.workspaces[this.workspaces.length - 1]
        }
      }
      this.engine.dispatch(new RemoveWorkspaceEvent(findedWorkspace))
    }
  }

  ensureWorkspace(props: IWorkspaceProps) {
    const workspace = this.findWorkspaceById(props.id)
    if (workspace) return workspace
    this.addWorkspace(props)
    return this.currentWorkspace
  }

  findWorkspaceById(id?: string) {
    return this.workspaces.find(item => item.id === id)
  }

  findWorkspaceIndexById(id: string) {
    return this.workspaces.findIndex(item => item.id === id)
  }

  mapWorkspace<T>(callbackFn: (value: Workspace, index: number) => T): T[] {
    return this.workspaces.map(callbackFn)
  }

  eachWorkspace<T>(callbackFn: (value: Workspace, index: number) => T) {
    this.workspaces.forEach(callbackFn)
  }
}
