import type { ICustomEvent } from '@formvk/designable-shared'

import { AbstractViewportEvent } from './AbstractViewportEvent'

export class ViewportScrollEvent extends AbstractViewportEvent implements ICustomEvent {
  type = 'viewport:scroll'
}
