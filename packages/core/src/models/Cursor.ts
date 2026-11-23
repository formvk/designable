import { isValidNumber } from '@formvk/designable-shared'
import { action, shallowRef } from '@formvk/reactive'
import { globalThisPolyfill } from '@formvk/shared'

import type { Engine } from './Engine'

export enum CursorStatus {
  Normal = 'NORMAL',
  DragStart = 'DRAG_START',
  Dragging = 'DRAGGING',
  DragStop = 'DRAG_STOP',
}

export enum CursorDragType {
  Move = 'MOVE',
  Resize = 'RESIZE',
  Rotate = 'ROTATE',
  Scale = 'SCALE',
  Translate = 'TRANSLATE',
  Round = 'ROUND',
}

export enum CursorType {
  Normal = 'NORMAL',
  Selection = 'SELECTION',
  Sketch = 'SKETCH',
}

export interface ICursorPosition {
  pageX?: number

  pageY?: number

  clientX?: number

  clientY?: number

  topPageX?: number

  topPageY?: number

  topClientX?: number

  topClientY?: number
}

export interface ICursor {
  status?: CursorStatus

  position?: ICursorPosition

  dragStartPosition?: ICursorPosition

  dragEndPosition?: ICursorPosition

  view?: Window
}

const DEFAULT_POSITION = {
  pageX: 0,
  pageY: 0,
  clientX: 0,
  clientY: 0,
  topPageX: 0,
  topPageY: 0,
  topClientX: 0,
  topClientY: 0,
}

const setCursorStyle = (contentWindow: Window, style: string) => {
  const currentRoot = document?.getElementsByTagName?.('html')?.[0]
  const root = contentWindow?.document?.getElementsByTagName('html')?.[0]
  if (root && root.style.cursor !== style) {
    root.style.cursor = style
  }
  if (currentRoot && currentRoot.style.cursor !== style) {
    currentRoot.style.cursor = style
  }
}

const calcPositionDelta = (end: ICursorPosition, start: ICursorPosition): ICursorPosition => {
  return Object.keys(end || {}).reduce((buf, key) => {
    if (isValidNumber(end?.[key]) && isValidNumber(start?.[key])) {
      buf[key] = end[key] - start[key]
    } else {
      buf[key] = end[key]
    }
    return buf
  }, {})
}

export class Cursor {
  engine: Engine

  @shallowRef accessor type: CursorType | string = CursorType.Normal

  @shallowRef accessor dragType: CursorDragType | string = CursorDragType.Move

  @shallowRef accessor status: CursorStatus = CursorStatus.Normal

  @shallowRef accessor position: ICursorPosition = DEFAULT_POSITION

  @shallowRef accessor dragStartPosition: ICursorPosition | undefined

  @shallowRef accessor dragEndPosition: ICursorPosition | undefined

  @shallowRef accessor dragAtomDelta: ICursorPosition = DEFAULT_POSITION

  @shallowRef accessor dragStartToCurrentDelta: ICursorPosition = DEFAULT_POSITION

  @shallowRef accessor dragStartToEndDelta: ICursorPosition = DEFAULT_POSITION

  @shallowRef accessor view: Window = globalThisPolyfill

  constructor(engine: Engine) {
    this.engine = engine
  }

  get speed() {
    return Math.sqrt(
      Math.pow(this.dragAtomDelta.clientX as number, 2) + Math.pow(this.dragAtomDelta.clientY as number, 2)
    )
  }

  @action
  setStatus(status: CursorStatus) {
    this.status = status
  }

  @action
  setType(type: CursorType | string) {
    this.type = type
  }

  setDragType(type: CursorDragType | string) {
    this.dragType = type
  }

  @action
  setStyle(style?: string) {
    if (!style) return
    this.engine.workbench.eachWorkspace(workspace => {
      setCursorStyle(workspace.viewport.contentWindow, style)
    })
  }

  @action
  setPosition(position: ICursorPosition) {
    this.dragAtomDelta = calcPositionDelta(this.position, position)
    this.position = { ...position }
    if (this.status === CursorStatus.Dragging) {
      this.dragStartToCurrentDelta = calcPositionDelta(this.position, this.dragStartPosition as ICursorPosition)
    }
  }

  setDragStartPosition(position?: ICursorPosition | null) {
    if (position) {
      this.dragStartPosition = { ...position }
    } else {
      this.dragStartPosition = undefined
      this.dragStartToCurrentDelta = DEFAULT_POSITION
    }
  }

  setDragEndPosition(position?: ICursorPosition) {
    if (!this.dragStartPosition) return
    if (position) {
      this.dragEndPosition = { ...position }
      this.dragStartToEndDelta = calcPositionDelta(this.dragStartPosition, this.dragEndPosition)
    } else {
      this.dragEndPosition = undefined
      this.dragStartToEndDelta = DEFAULT_POSITION
    }
  }
}
