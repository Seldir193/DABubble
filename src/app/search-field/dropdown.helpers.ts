// dropdown.helpers.ts

export function onSelfClickWrapper(event: MouseEvent): void {
  event.stopPropagation();
}


export function onDocumentClickWrapper(
  dropdownState: 'hidden' | 'user' | 'channel',
  setDropdownState: (val: 'hidden' | 'user' | 'channel') => void
): void {
  if (dropdownState !== 'hidden') {
    setDropdownState('hidden');
  }
}