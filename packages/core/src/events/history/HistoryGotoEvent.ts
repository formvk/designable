import type { ICustomEvent } from '@formvk/designable-shared'

import { AbstractHistoryEvent } from './AbstractHistoryEvent'

export class HistoryGotoEvent extends AbstractHistoryEvent implements ICustomEvent {
  type = 'history:goto'
}
