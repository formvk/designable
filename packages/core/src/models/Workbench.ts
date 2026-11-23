import { action, shallow, shallowRef } from '@formvk/reactive'

import { AddWorkspaceEvent, RemoveWorkspaceEvent, SwitchWorkspaceEvent } from '../events'
import type { IEngineContext, WorkbenchTypes } from '../types'
import type { Engine } from './Engine'
import type { IWorkspaceProps } from './Workspace'
import { Workspace } from './Workspace'
export class Workbench {
  @shallow accessor workspaces: Workspace[]

  @shallowRef accessor currentWorkspace: Workspace | undefined

  @shallowRef accessor activeWorkspace: Workspace | undefined

  engine: Engine

  @shallowRef accessor type: WorkbenchTypes = 'DESIGNABLE'

  constructor(engine: Engine) {
    this.engine = engine
    this.workspaces = []
    this.currentWorkspace = undefined
    this.activeWorkspace = undefined
  }

  getEventContext(): IEngineContext {
    return {
      engine: this.engine,
      workbench: this.engine.workbench,
    }
  }

  @action
  switchWorkspace(id: string) {
    const finded = this.findWorkspaceById(id)
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
  setWorkbenchType(type: WorkbenchTypes) {
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
