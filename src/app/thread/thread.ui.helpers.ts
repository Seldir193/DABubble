// thread.ui.helpers.ts
import { ThreadComponent } from './thread.component';

export function openLargeImageComp(
  comp: ThreadComponent,
  imageData: string | ArrayBuffer
): void {
  if (typeof imageData !== 'string') return;
  comp.largeImageUrl = imageData;
  comp.showLargeImage = true;
}

export function closeLargeImageComp(comp: ThreadComponent): void {
  comp.showLargeImage = false;
  comp.largeImageUrl = null;
}

export function openImageModalComp(comp: ThreadComponent): void {
  comp.isImageModalOpen = true;
}

export function closeImageModalComp(comp: ThreadComponent): void {
  comp.isImageModalOpen = false;
}

export function toggleEmojiPickerComp(
  comp: ThreadComponent,
  event: MouseEvent
): void {
  event.stopPropagation();

  if (!comp.isEmojiPickerVisible) {
    comp.dropdownState = 'hidden';
    comp.cycleStep = 1;
  }

  comp.isEmojiPickerVisible = !comp.isEmojiPickerVisible;
}
