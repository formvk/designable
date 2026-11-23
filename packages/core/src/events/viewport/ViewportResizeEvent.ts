import type { ICustomEvent } from '@formvk/designable-shared'

import { AbstractViewportEvent } from './AbstractViewportEvent'

export class ViewportResizeEvent extends AbstractViewportEvent implements ICustomEvent {
  type = 'viewport:resize'
}
