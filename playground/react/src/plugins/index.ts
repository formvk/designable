import type { IDesignerPlugin } from '@formvk/designable-react'

import { auxToolsPlugin } from './aux-tools'
import { panelsPlugin } from './panels'
import { screenToolsPlugin } from './screen-tools'
import { viewToolsPlugin } from './view-tools'

export const plugins: IDesignerPlugin[] = [viewToolsPlugin, screenToolsPlugin, panelsPlugin, auxToolsPlugin]
