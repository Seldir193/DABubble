import { EntwicklerteamComponent } from './entwicklerteam.component';

export function focusTextArea(self: EntwicklerteamComponent): void {
  if (!self.textAreaRef) return;
  self.textAreaRef.nativeElement.focus();
}

export function onImageSelected(
  self: EntwicklerteamComponent,
  e: Event,
  txtArea: HTMLTextAreaElement
): void {
  const input = e.target as HTMLInputElement;
  if (!input?.files?.[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (r) => {
    self.imageUrl = r?.target?.result;
    adjustTextareaHeight(self, txtArea);
    self.isTextareaExpanded = true;
  };
  reader.readAsDataURL(file);
}

export function closeProfileCard(
  self: EntwicklerteamComponent,
  txtArea: HTMLTextAreaElement
): void {
  self.imageUrl = null;
  self.isTextareaExpanded = false;
  resetTextareaHeight(self, txtArea);
}

export function adjustTextareaHeight(
  self: EntwicklerteamComponent,
  txtArea: HTMLTextAreaElement
): void {
  if (self.imageUrl) {
    txtArea.style.paddingBottom = '160px';
  }
}

export function resetTextareaHeight(
  self: EntwicklerteamComponent,
  txtArea: HTMLTextAreaElement
): void {
  txtArea.style.paddingBottom = '20px';
}
