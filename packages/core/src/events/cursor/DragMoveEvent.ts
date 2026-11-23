import type { ICustomEvent } from '@formvk/designable-shared'

import { AbstractCursorEvent } from './AbstractCursorEvent'

export class DragMoveEvent extends AbstractCursorEvent implements ICustomEvent {
  type = 'drag:move'
}
