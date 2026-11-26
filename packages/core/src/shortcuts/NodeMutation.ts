import { KeyCode, Shortcut } from '../models/Shortcut'
import { TreeNode } from '../models/TreeNode'

/**
 * 快捷删除，快捷复制粘贴
 */

export const DeleteNodes = new Shortcut({
  codes: [[KeyCode.Backspace], [KeyCode.Delete]],
  async handler(context) {
    const operation = context.workspace?.operation
    if (operation) {
      await TreeNode.remove(operation.selection.selectedNodes)
    }
  },
})

interface IClipboard {
  nodes: TreeNode[]
}

const Clipboard: IClipboard = {
  nodes: [],
}

export const CopyNodes = new Shortcut({
  codes: [
    [KeyCode.Meta, KeyCode.C],
    [KeyCode.Control, KeyCode.C],
  ],
  handler(context) {
    const operation = context.workspace?.operation
    if (operation) {
      Clipboard.nodes = operation.selection.selectedNodes
    }
  },
})

export const PasteNodes = new Shortcut({
  codes: [
    [KeyCode.Meta, KeyCode.V],
    [KeyCode.Control, KeyCode.V],
  ],
  async handler(context) {
    const operation = context.workspace?.operation
    if (operation) {
      await TreeNode.clone(Clipboard.nodes)
    }
  },
})
