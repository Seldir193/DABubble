// thread.edit.helpers.ts
import { ThreadComponent } from './thread.component';

export function toggleEditOptionsComp(
  comp: ThreadComponent,
  msgId: string
): void {
  if (comp.currentMessageId === msgId && comp.showEditOptions) {
    comp.showEditOptions = false;
    comp.currentMessageId = null;
  } else {
    comp.showEditOptions = true;
    comp.currentMessageId = msgId;
  }
}

export function startEditingComp(comp: ThreadComponent, msg: any): void {
  msg.isEditing = true;
  comp.originalMessage = JSON.parse(JSON.stringify(msg));
  comp.showEditOptions = false;
}

export function cancelEditingComp(comp: ThreadComponent, msg: any): void {
  if (comp.originalMessage) {
    msg.content.text = comp.originalMessage.content.text;
    comp.originalMessage = null;
  }
  msg.isEditing = false;
  comp.showEditOptions = false;
}
