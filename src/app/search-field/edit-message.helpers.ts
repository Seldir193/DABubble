// edit-message.helpers.ts
import { SearchFieldComponent } from './search-field.component';
import {
  toggleEditOptionsHelper,
  EditState,
  startEditingHelper,
  toggleEditMessageHelper,
  cancelEditingHelper,
} from './search-field.imports';

export function toggleEditOptionsComp(
  comp: SearchFieldComponent,
  msgId: string
): void {
  const newState: EditState = toggleEditOptionsHelper(
    comp.currentMessageId,
    msgId,
    comp.showEditOptions
  );
  comp.currentMessageId = newState.currentMessageId;
  comp.showEditOptions = newState.showEditOptions;
}

export function startEditingComp(comp: SearchFieldComponent, msg: any): void {
  msg.isEditing = true;
  comp.originalMessage = startEditingHelper(msg);
  comp.showEditOptions = false;
}

export function toggleEditMessageComp(
  comp: SearchFieldComponent,
  msg: any
): void {
  msg.isEditing = true;
  comp.originalMessage = toggleEditMessageHelper(msg);
}

export function cancelEditingComp(comp: SearchFieldComponent, msg: any): void {
  const result = cancelEditingHelper(msg, comp.originalMessage);
  msg = result.updatedMsg;
  comp.originalMessage = result.restoredOriginal;
  comp.showEditOptions = false;
}
