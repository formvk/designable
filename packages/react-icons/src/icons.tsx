import type { FC, ReactNode } from 'react'

import { createIcon } from './createIcon'
import type { IconName, IconProps } from './types'

const icon = (name: string, children: ReactNode) => createIcon({ displayName: name, children })

export const ArrowLeft = icon(
  'ArrowLeft',
  <>
    <path d="M19 12H5" />
    <path d="M11 18l-6-6 6-6" />
  </>
)

export const ArrowRight = icon(
  'ArrowRight',
  <>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </>
)

export const ArrowUp = icon(
  'ArrowUp',
  <>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </>
)

export const ArrowDown = icon(
  'ArrowDown',
  <>
    <path d="M12 5v14" />
    <path d="M18 13l-6 6-6-6" />
  </>
)

export const ChevronLeft = icon('ChevronLeft', <path d="M15 5l-7 7 7 7" />)

export const ChevronRight = icon('ChevronRight', <path d="M9 5l7 7-7 7" />)

export const ChevronUp = icon('ChevronUp', <path d="M5 15l7-7 7 7" />)

export const ChevronDown = icon('ChevronDown', <path d="M5 9l7 7 7-7" />)

export const Plus = icon('Plus', <path d="M12 5v14M5 12h14" />)

export const Minus = icon('Minus', <path d="M5 12h14" />)

export const Close = icon('Close', <path d="M6 6l12 12M18 6L6 18" />)

export const Check = icon('Check', <path d="M5 12.5l4.5 4.5L19 7" />)

export const Search = icon(
  'Search',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>
)

export const Delete = icon(
  'Delete',
  <>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6.5 7l.8 12.2h9.4L17.5 7" />
    <path d="M10 11v4.5M14 11v4.5" />
  </>
)

export const Copy = icon(
  'Copy',
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </>
)

export const Paste = icon(
  'Paste',
  <>
    <rect x="7" y="4" width="10" height="16" rx="2" />
    <path d="M9 4.5V3h6v1.5" />
    <path d="M10 10h4M10 14h4" />
  </>
)

export const Undo = icon(
  'Undo',
  <>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h9.5a5.5 5.5 0 0 1 0 11H10" />
  </>
)

export const Redo = icon(
  'Redo',
  <>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9h-9.5a5.5 5.5 0 0 0 0 11H14" />
  </>
)

export const DragMove = icon(
  'DragMove',
  <>
    <path d="M12 3v18M3 12h18" />
    <path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  </>
)

export const Resize = icon(
  'Resize',
  <>
    <path d="M15 3h6v6" />
    <path d="M21 3l-8 8" />
    <path d="M9 21H3v-6" />
    <path d="M3 21l8-8" />
  </>
)

export const Setting = icon(
  'Setting',
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>
)

export const Eye = icon(
  'Eye',
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
)

export const EyeClose = icon(
  'EyeClose',
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.9" />
    <path d="M6.3 6.8A17 17 0 0 0 2.5 12S6 18 12 18a9.5 9.5 0 0 0 4.2-.95" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>
)

export const Monitor = icon(
  'Monitor',
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>
)

export const Tablet = icon(
  'Tablet',
  <>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M11 18h2" />
  </>
)

export const Phone = icon(
  'Phone',
  <>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </>
)

export const Node = icon(
  'Node',
  <>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
  </>
)

export const Outline = icon(
  'Outline',
  <>
    <rect x="9" y="3" width="6" height="5" rx="1.5" />
    <rect x="2.5" y="16" width="6" height="5" rx="1.5" />
    <rect x="15.5" y="16" width="6" height="5" rx="1.5" />
    <path d="M12 8v4M5.5 16v-2h13v2" />
  </>
)

export const History = icon(
  'History',
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3 9" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4.5l3 2" />
  </>
)

export const Code = icon(
  'Code',
  <>
    <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />
  </>
)

export const Preview = icon(
  'Preview',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5v-7z" />
  </>
)

export const Fullscreen = icon('Fullscreen', <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />)

export const ExitFullscreen = icon('ExitFullscreen', <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />)

export const Sun = icon(
  'Sun',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </>
)

export const Moon = icon('Moon', <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5z" />)

export const Auto = icon(
  'Auto',
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
  </>
)

export const Lock = icon(
  'Lock',
  <>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </>
)

export const Unlock = icon(
  'Unlock',
  <>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 7.5-2" />
  </>
)

export const ZoomIn = icon(
  'ZoomIn',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
    <path d="M8.5 11h5M11 8.5v5" />
  </>
)

export const ZoomOut = icon(
  'ZoomOut',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
    <path d="M8.5 11h5" />
  </>
)

export const Question = icon(
  'Question',
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 9.3a2.6 2.6 0 0 1 5.1.7c0 1.8-2.6 2.1-2.6 4" />
    <path d="M12 17.2h.01" />
  </>
)

export const icons: Record<IconName, FC<IconProps>> = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  plus: Plus,
  minus: Minus,
  close: Close,
  check: Check,
  search: Search,
  delete: Delete,
  copy: Copy,
  paste: Paste,
  undo: Undo,
  redo: Redo,
  'drag-move': DragMove,
  resize: Resize,
  setting: Setting,
  eye: Eye,
  'eye-close': EyeClose,
  monitor: Monitor,
  tablet: Tablet,
  phone: Phone,
  node: Node,
  outline: Outline,
  history: History,
  code: Code,
  preview: Preview,
  fullscreen: Fullscreen,
  'exit-fullscreen': ExitFullscreen,
  sun: Sun,
  moon: Moon,
  auto: Auto,
  lock: Lock,
  unlock: Unlock,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  question: Question,
}

export interface IconComponentProps extends IconProps {
  name?: IconName
}

/**
 * 按名称渲染图标，未知名称回退到问号图标
 */
export const Icon: FC<IconComponentProps> = ({ name, ...props }) => {
  const Component = (name && icons[name]) || Question
  return <Component {...props} />
}
