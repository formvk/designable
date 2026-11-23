import { Engine } from '../models/Engine'
import type { Workspace } from '../models/Workspace'

export const createDesigner = (id?: string) => {
  const viewportElement = document.createElement('div')
  document.body.appendChild(viewportElement)

  const engine = new Engine({ nodeIdAttrName: 'data-designer-node-id' })
  const workspace = engine.workbench.addWorkspace({
    id,
    title: '测试工作区',
    description: '单元测试',
    contentWindow: window,
    viewportElement,
  }) as Workspace

  return { engine, workspace, viewportElement }
}
