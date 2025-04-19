export function focusTextArea(c: any) {
  if (c.textAreaRef) {
    c.textAreaRef.nativeElement.focus();
  }
}

export function closeProfileCard(c: any, t: HTMLTextAreaElement) {
  c.imageUrl = null;
  resetTextareaHeight(c, t);
}

export function adjustTextareaHeight(c: any, t: HTMLTextAreaElement) {
  if (c.imageUrl) {
    t.style.paddingBottom = '160px';
  }
}

export function resetTextareaHeight(c: any, t: HTMLTextAreaElement) {
  t.style.paddingBottom = '20px';
}

export function handleKeyDown(
  c: any,
  e: KeyboardEvent,
  t: HTMLTextAreaElement
) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    c.sendPrivateMessage(t);
  }
}

export function onImageSelected(c: any, e: Event, t?: HTMLTextAreaElement) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      c.imageUrl = ev.target?.result || null;
      if (t) adjustTextareaHeight(c, t);
      c.isTextareaExpanded = true;
    };
    reader.readAsDataURL(file);
  }
}

export function toggleEmojiPicker(c: any, e: MouseEvent) {
  e.stopPropagation();

  if (!c.isEmojiPickerVisible) {
    c.dropdownState = 'hidden';
    c.cycleStep = 1;
  }

  c.isEmojiPickerVisible = !c.isEmojiPickerVisible;
}

export function addEmoji(c: any, e: any) {
  if (e?.emoji?.native) {
    c.privateMessage += e.emoji.native;
  }
}

export function onEmojiPickerClick(e: MouseEvent) {
  e.stopPropagation();
}

export function openLargeImage(c: any, data: string | ArrayBuffer) {
  if (typeof data !== 'string') return;
  c.largeImageUrl = data;
  c.showLargeImage = true;
}

export function closeLargeImage(c: any) {
  c.showLargeImage = false;
  c.largeImageUrl = null;
}

export function highlightMessage(c: any, messageId: string, retries = 5) {
  setTimeout(() => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      highlightMessage(c, messageId, retries - 1);
    }
  }, 500);
}
