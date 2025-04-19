export interface EditState {
  currentMessageId: string | null;
  showEditOptions: boolean;
  originalMessage: any | null;
}

export function toggleEditOptionsHelper(
  currentMsgId: string | null,
  targetMsgId: string,
  currentShowEdit: boolean
): EditState {
  if (currentMsgId === targetMsgId && currentShowEdit) {
    return {
      currentMessageId: null,
      showEditOptions: false,
      originalMessage: null,
    };
  } else {
    return {
      currentMessageId: targetMsgId,
      showEditOptions: true,
      originalMessage: null,
    };
  }
}

export function startEditingHelper(msg: any): any {
  msg.isEditing = true;
  return { ...msg };
}

export function toggleEditMessageHelper(msg: any): any {
  msg.isEditing = true;
  return { ...msg };
}

export function cancelEditingHelper(
  msg: any,
  originalMessage: any
): { updatedMsg: any; restoredOriginal: any } {
  msg.isEditing = false;
  if (originalMessage) {
    msg.content = { ...originalMessage.content };
    return { updatedMsg: msg, restoredOriginal: null };
  }
  return { updatedMsg: msg, restoredOriginal: originalMessage };
}
