import { KeyCode } from '@formvk/designable-shared'
import { describe, expect, it } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { CursorStatus, CursorType } from '../Cursor'
import { Engine } from '../Engine'
import { ScreenStatus, ScreenType } from '../Screen'
import { TreeNode } from '../TreeNode'

describe('Engine', () => {
  it('初始化默认属性与模型', () => {
    const engine = new Engine({})

    expect(engine.props.rootComponentName).toBe('Root')
    expect(engine.props.nodeIdAttrName).toBe('data-designer-node-id')
    expect(engine.screen.type).toBe(ScreenType.PC)
    expect(engine.screen.scale).toBe(1)
    expect(engine.cursor.status).toBe(CursorStatus.Normal)
    expect(engine.cursor.type).toBe(CursorType.Normal)
    expect(engine.keyboard.sequence).toEqual([])
    expect(engine.workbench.workspaces).toEqual([])
    expect(engine.workbench.currentWorkspace).toBeUndefined()
  })

  it('addWorkspace / switchWorkspace / removeWorkspace 管理画布', () => {
    const { engine, workspace } = createDesigner('w1')

    expect(engine.workbench.currentWorkspace).toBe(workspace)
    expect(engine.workbench.findWorkspaceById('w1')).toBe(workspace)
    expect(engine.workbench.findWorkspaceIndexById('w1')).toBe(0)

    const viewportElement = document.createElement('div')
    const second = engine.workbench.addWorkspace({
      id: 'w2',
      title: '第二个工作区',
      description: '',
      contentWindow: window,
      viewportElement,
    })!

    expect(engine.workbench.workspaces).toHaveLength(2)
    expect(engine.workbench.currentWorkspace).toBe(second)

    engine.workbench.switchWorkspace('w1')
    expect(engine.workbench.currentWorkspace).toBe(workspace)

    engine.workbench.removeWorkspace('w1')
    expect(engine.workbench.findWorkspaceById('w1')).toBeUndefined()
    expect(engine.workbench.currentWorkspace).toBe(second)
  })

  it('ensureWorkspace 复用已有工作区', () => {
    const { engine, workspace } = createDesigner('w1')
    const props = {
      id: 'w1',
      title: '工作区',
      description: '',
      contentWindow: window,
      viewportElement: workspace.viewport.viewportElement,
    }

    expect(engine.workbench.ensureWorkspace(props)).toBe(workspace)
    expect(engine.workbench.workspaces).toHaveLength(1)
  })

  it('Screen 提供尺寸 / 缩放 / 背景等控制', () => {
    const { engine } = createDesigner()

    engine.screen.setType(ScreenType.Mobile)
    engine.screen.setScale(2)
    engine.screen.setSize(375, 667)
    engine.screen.setBackground('#fff')
    engine.screen.setFlip(true)
    engine.screen.setStatus(ScreenStatus.Resizing)

    expect(engine.screen.type).toBe(ScreenType.Mobile)
    expect(engine.screen.scale).toBe(2)
    expect(engine.screen.width).toBe(375)
    expect(engine.screen.height).toBe(667)
    expect(engine.screen.background).toBe('#fff')
    expect(engine.screen.flip).toBe(true)
    expect(engine.screen.status).toBe(ScreenStatus.Resizing)

    engine.screen.resetSize()
    expect(engine.screen.width).toBe('100%')
    expect(engine.screen.height).toBe('100%')
  })

  it('Cursor 计算拖拽增量', () => {
    const { engine } = createDesigner()
    const start = {
      pageX: 0,
      pageY: 0,
      clientX: 0,
      clientY: 0,
      topPageX: 0,
      topPageY: 0,
      topClientX: 0,
      topClientY: 0,
    }
    const current = {
      pageX: 10,
      pageY: 20,
      clientX: 10,
      clientY: 20,
      topPageX: 10,
      topPageY: 20,
      topClientX: 10,
      topClientY: 20,
    }

    engine.cursor.setDragStartPosition(start)
    engine.cursor.setStatus(CursorStatus.Dragging)
    engine.cursor.setPosition(current)

    expect(engine.cursor.dragStartPosition).toEqual(start)
    expect(engine.cursor.dragStartToCurrentDelta.clientX).toBe(10)
    expect(engine.cursor.dragStartToCurrentDelta.clientY).toBe(20)
    expect(engine.cursor.speed).toBeCloseTo(Math.sqrt(500))

    engine.cursor.setDragStartPosition(null)
    expect(engine.cursor.dragStartPosition).toBeUndefined()
  })

  it('Keyboard 维护按键序列', () => {
    const { engine } = createDesigner()
    const keyboard = engine.keyboard

    keyboard.addKeyCode(KeyCode.Control)
    keyboard.addKeyCode(KeyCode.a)

    expect(keyboard.sequence).toEqual([KeyCode.Control, KeyCode.a])
    expect(keyboard.includes(KeyCode.a)).toBe(true)
    expect(keyboard.includes(KeyCode.A)).toBe(true)
    expect(keyboard.includes(KeyCode.b)).toBe(false)

    keyboard.excludes(KeyCode.a)
    expect(keyboard.includes(KeyCode.a)).toBe(false)
  })

  it('管理当前组件树与节点查询', () => {
    const { engine } = createDesigner()
    const tree = engine.getCurrentTree()

    expect(tree?.componentName).toBe('Root')

    engine.setCurrentTree({ componentName: 'Form', props: { layout: 'vertical' } })
    expect(engine.getCurrentTree()?.componentName).toBe('Form')

    const node = engine.createNode({ componentName: 'Input', props: {} })
    expect(node).toBeInstanceOf(TreeNode)
    expect(engine.findNodeById(node.id)).toBe(node)
  })
})
