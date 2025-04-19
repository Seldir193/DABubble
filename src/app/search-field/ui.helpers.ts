import { SearchFieldComponent } from './search-field.component';

export function toggleEmojiPickerComp(comp: SearchFieldComponent, event?: MouseEvent): void {
  event?.stopPropagation();

  if (!comp.isEmojiPickerVisible) {
    comp.dropdownState = 'hidden';
  }

  comp.isEmojiPickerVisible = !comp.isEmojiPickerVisible;
}

export function addEmojiComp(comp: SearchFieldComponent, event: any): void {
  if (event?.emoji?.native) comp.messageToAll += event.emoji.native;
  comp.isEmojiPickerVisible = false;
}

export function openImageModalComp(comp: SearchFieldComponent): void {
  comp.isImageModalOpen = true;
}

export function closeImageModalComp(comp: SearchFieldComponent): void {
  comp.isImageModalOpen = false;
}
