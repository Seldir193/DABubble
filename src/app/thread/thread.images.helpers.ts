import { ThreadComponent } from './thread.component';

export function onImageSelectedComp(
  comp: ThreadComponent,
  event: Event,
  textArea?: HTMLTextAreaElement
): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      comp.imageUrl = e.target?.result as string;
      if (textArea) adjustTextareaHeightComp(comp, textArea);
    };
    reader.readAsDataURL(file);
  }
}

export function adjustTextareaHeightComp(
  comp: ThreadComponent,
  textArea: HTMLTextAreaElement
): void {
  if (comp.imageUrl) textArea.style.paddingBottom = '160px';
}

export function resetTextareaHeightComp(textArea: HTMLTextAreaElement): void {
  textArea.style.paddingBottom = '20px';
}

export function closeProfileCardComp(
  comp: ThreadComponent,
  textArea: HTMLTextAreaElement
): void {
  comp.imageUrl = null;
}
