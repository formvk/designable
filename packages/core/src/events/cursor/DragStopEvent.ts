import type { ICustomEvent } from '@formvk/designable-shared'

import { AbstractCursorEvent } from './AbstractCursorEvent'

export class DragStopEvent extends AbstractCursorEvent implements ICustomEvent {
  type = 'drag:stop'
}
