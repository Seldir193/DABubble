export function onImageSelected(
  event: Event,
  textArea: HTMLTextAreaElement | undefined,
  setImageUrl: (value: string | ArrayBuffer | null) => void,
  adjustTextareaHeightFn: (
    textArea: HTMLTextAreaElement,
    imageUrl: string | ArrayBuffer | null
  ) => void,
  setIsTextareaExpanded: (value: boolean) => void
): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result || null;
      setImageUrl(result);
      if (textArea) {
        adjustTextareaHeightFn(textArea, result);
      }
      setIsTextareaExpanded(true);
    };
    reader.readAsDataURL(file);
  }
}

export function adjustTextareaHeight(
  textArea: HTMLTextAreaElement,
  imageUrl: string | ArrayBuffer | null
): void {
  if (imageUrl) {
    textArea.style.paddingBottom = '160px';
  }
}

export function resetTextareaHeight(textArea: HTMLTextAreaElement): void {
  textArea.style.paddingBottom = '20px';
}

export function openImageModal(
  setIsImageModalOpen: (open: boolean) => void
): void {
  setIsImageModalOpen(true);
}

export function closeImageModal(
  setIsImageModalOpen: (open: boolean) => void
): void {
  setIsImageModalOpen(false);
}

export function closeProfileCard(
  setImageUrl: (value: string | ArrayBuffer | null) => void,
  textArea: HTMLTextAreaElement,
  resetTextareaHeightFn: (textArea: HTMLTextAreaElement) => void
): void {
  setImageUrl(null);
  resetTextareaHeightFn(textArea);
}

export function scrollToBottom(messageList: { nativeElement: any }): void {
  setTimeout(() => {
    if (messageList) {
      messageList.nativeElement.scrollTop =
        messageList.nativeElement.scrollHeight;
    }
  }, 100);
}

export function showTooltip(
  event: MouseEvent,
  setTooltipVisible: (visible: boolean) => void,
  setTooltipEmoji: (emoji: string) => void,
  setTooltipSenderName: (name: string) => void,
  setTooltipPosition: (pos: { x: number; y: number }) => void,
  emoji: string,
  senderName: string
): void {
  setTooltipVisible(true);
  setTooltipEmoji(emoji);
  setTooltipSenderName(senderName);
  setTooltipPosition({
    x: event.clientX,
    y: event.clientY - 40,
  });
}

export function hideTooltip(
  setTooltipVisible: (visible: boolean) => void
): void {
  setTooltipVisible(false);
}
