import { action, shallowRef } from '@formvk/reactive'

import type { Engine } from './Engine'

export enum ScreenType {
  PC = 'PC',
  Responsive = 'Responsive',
  Mobile = 'Mobile',
  Sketch = 'Sketch',
}

export enum ScreenStatus {
  Normal = 'Normal',
  Resizing = 'Resizing',
  Zooming = 'Zooming',
}

export class Screen {
  @shallowRef accessor type: ScreenType
  @shallowRef accessor scale = 1
  @shallowRef accessor width: number | string = '100%'
  @shallowRef accessor height: number | string = '100%'
  engine: Engine
  @shallowRef accessor background = ''
  @shallowRef accessor flip = false
  @shallowRef accessor status = ScreenStatus.Normal
  constructor(engine: Engine) {
    this.engine = engine
    this.type = engine.props.defaultScreenType
  }

  setStatus(status: ScreenStatus) {
    this.status = status
  }

  @action
  setType(type: ScreenType) {
    this.type = type
  }

  @action
  setScale(scale: number) {
    this.scale = scale
  }

  @action
  setSize(width?: number | string, height?: number | string) {
    if (width) {
      this.width = width
    }
    if (height) {
      this.height = height
    }
  }

  @action
  resetSize() {
    this.width = '100%'
    this.height = '100%'
  }

  @action
  setBackground(background: string) {
    this.background = background
  }

  @action
  setFlip(flip: boolean) {
    this.flip = flip
  }
}
