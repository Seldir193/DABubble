import { ThreadChannelComponent } from './thread-channel.component';

export function checkDesktopWidthHelper(component: ThreadChannelComponent) {
  component.isDesktop = window.innerWidth >= 1278;
}

export function convertTimestampHelper(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
}

export function scrollToBottomHelper(component: ThreadChannelComponent): void {
  try {
    setTimeout(() => {
      if (component.messageList?.nativeElement) {
        component.messageList.nativeElement.scrollTop =
          component.messageList.nativeElement.scrollHeight;
      }
    }, 500);
  } catch (err) {}
}

export function adjustTextareaHeightHelper(
  component: ThreadChannelComponent,
  textArea: HTMLTextAreaElement
): void {
  if (component.imageUrl) {
    textArea.style.paddingBottom = '160px';
  }
}

export function resetTextareaHeightHelper(textArea: HTMLTextAreaElement): void {
  textArea.style.paddingBottom = '20px';
}

export function onImageSelectedHelper(
  component: ThreadChannelComponent,
  event: Event,
  textArea: HTMLTextAreaElement
): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      component.imageUrl = e.target?.result as string;
      if (textArea) {
        adjustTextareaHeightHelper(component, textArea);
      }
      component.isTextareaExpanded = true;
    };
    reader.readAsDataURL(file);
  }
}

export function closeProfileCardHelper(
  component: ThreadChannelComponent,
  textArea: HTMLTextAreaElement
): void {
  component.imageUrl = null;
  resetTextareaHeightHelper(textArea);
}

export function openLargeImageHelper(
  component: ThreadChannelComponent,
  imageData: string | ArrayBuffer
) {
  if (typeof imageData !== 'string') {
    return;
  }
  component.largeImageUrl = imageData;
  component.showLargeImage = true;
}

export function closeLargeImageHelper(component: ThreadChannelComponent) {
  component.showLargeImage = false;
  component.largeImageUrl = null;
}
