import { KeyCode, Shortcut } from '../models/Shortcut'

export const UndoMutation = new Shortcut({
  codes: [
    [KeyCode.Meta, KeyCode.Z],
    [KeyCode.Control, KeyCode.Z],
  ],
  async handler(context) {
    const workspace = context?.workspace
    if (workspace) {
      await workspace.history.undo()
      workspace.operation.hover.clear()
    }
  },
})

export const RedoMutation = new Shortcut({
  codes: [
    [KeyCode.Meta, KeyCode.Shift, KeyCode.Z],
    [KeyCode.Control, KeyCode.Shift, KeyCode.Z],
  ],
  async handler(context) {
    const workspace = context?.workspace
    if (workspace) {
      await workspace.history.redo()
      workspace.operation.hover.clear()
    }
  },
})
