import { KeyDownEvent, KeyUpEvent } from '../events'
import type { Engine } from '../models'

export const useKeyboardEffect = (engine: Engine) => {
  engine.subscribeTo(KeyDownEvent, event => {
    const keyboard = engine.keyboard
    if (!keyboard) return
    const workspace = engine.workbench.activeWorkspace || engine.workbench.currentWorkspace
    if (!workspace) return
    keyboard.handleKeyboard(event, workspace.getEventContext())
  })

  engine.subscribeTo(KeyUpEvent, event => {
    const keyboard = engine.keyboard
    if (!keyboard) return
    const workspace = engine.workbench.activeWorkspace || engine.workbench.currentWorkspace
    if (!workspace) return
    keyboard.handleKeyboard(event, workspace.getEventContext())
  })
}
