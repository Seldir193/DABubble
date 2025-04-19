// thread.dropdown.helpers.ts
import { ThreadComponent } from './thread.component';

export function resetDropdownComp(comp: ThreadComponent): void {
  comp.dropdownState = 'hidden';
  comp.cycleStep = 1;
  comp.lastOpenedChar = '';
}

export function onTextareaInputComp(comp: ThreadComponent, event: Event): void {
  const i = event as InputEvent;
  const ta = event.target as HTMLTextAreaElement;
  let txt = ta.value;
  handleThreadDelete(comp, txt, i);
  if (i.data === '@' || (txt.endsWith('@') && comp.lastOpenedChar !== '@')) {
    handleThreadAtBlock(comp, ta, txt);
    return;
  }

  if (i.data === '#' || (txt.endsWith('#') && comp.lastOpenedChar !== '#')) {
    handleThreadHashBlock(comp, ta, txt);
    return;
  }
  handleThreadInputDefault(comp, txt);
}

export const addUserSymbolComp = (
  c: ThreadComponent,
  member: { name: string }
): void => insertToken(c, `@${member.name}`);

const insertToken = (c: ThreadComponent, token: string): void => {
  const ta = c.textAreaRef?.nativeElement;
  const raw = ta ? ta.value : c.privateMessage;

  const txt = `${cleanText(raw, c).trimEnd()} ${token} `;
  if (ta) {
    ta.value = txt;
    ta.setSelectionRange(txt.length, txt.length);
    ta.focus();
  }

  c.privateMessage = txt;
  resetDropdownComp(c);
};

const cleanText = (t: string, c: ThreadComponent) =>
  removeAllInvalidMentionsWithSpaces(
    t,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );

export const selectChannelComp = (
  c: ThreadComponent,
  channel: { name: string }
): void => insertToken(c, `#${channel.name}`);

function handleThreadDelete(comp: ThreadComponent, t: string, i: InputEvent) {
  if (
    i.inputType !== 'deleteContentBackward' &&
    i.inputType !== 'deleteContentForward'
  )
    return;

  if (!t.includes('@') && comp.dropdownState === 'user')
    resetDropdownComp(comp);
  if (!t.includes('#') && comp.dropdownState === 'channel')
    resetDropdownComp(comp);
}

function handleThreadAtBlock(
  comp: ThreadComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  t = removeAllInvalidMentionsWithSpaces(
    t,
    comp.allUsersOriginal,
    comp.allChannelsOriginal
  );
  t = removePreviousAtWithoutSpace(t);
  t = ensureEndsWithSymbol(t, '@');
  finalizeThreadAtInput(comp, ta, t);
}

function handleThreadHashBlock(
  comp: ThreadComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  t = removeAllInvalidMentionsWithSpaces(
    t,
    comp.allUsersOriginal,
    comp.allChannelsOriginal
  );
  t = removePreviousHashWithoutSpace(t);
  t = ensureEndsWithSymbol(t, '#');
  finalizeThreadHashInput(comp, ta, t);
}

function handleThreadInputDefault(comp: ThreadComponent, t: string) {
  comp.lastOpenedChar = '';
  if (comp.dropdownState === 'user') handleThreadUserFilter(comp, t);
  else if (comp.dropdownState === 'channel') handleThreadChannelFilter(comp, t);
  else resetDropdownComp(comp);
}

function handleThreadUserFilter(comp: ThreadComponent, t: string) {
  const pos = t.lastIndexOf('@');
  if (pos === -1) {
    resetDropdownComp(comp);
    return;
  }
  comp.allUsers = [...comp.allUsersOriginal];
  const sub = t
    .substring(pos + 1)
    .trim()
    .toLowerCase();
  if (sub.length > 0) {
    comp.allUsers = comp.allUsers.filter((u) =>
      u.name?.toLowerCase().includes(sub)
    );
  }
}

function finalizeThreadAtInput(
  comp: ThreadComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  comp.privateMessage = t;
  comp.dropdownState = 'user';
  comp.lastOpenedChar = '@';
  comp.allUsers = [...comp.allUsersOriginal];
}

function finalizeThreadHashInput(
  comp: ThreadComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  comp.privateMessage = t;
  comp.dropdownState = 'channel';
  comp.lastOpenedChar = '#';
  comp.allChannels = [...comp.allChannelsOriginal];
}

function removePreviousAtWithoutSpace(t: string): string {
  const last = t.lastIndexOf('@');
  if (last === -1) return t;
  const prev = t.lastIndexOf('@', last - 1);
  if (prev === -1) return t;
  const between = t.substring(prev + 1, last);
  if (!between.includes(' ')) {
    const before = t.slice(0, prev).trimEnd();
    const after = t.slice(last);
    return (before + ' ' + after).trim();
  }
  return t;
}

function removePreviousHashWithoutSpace(t: string): string {
  const last = t.lastIndexOf('#');
  if (last === -1) return t;
  const prev = t.lastIndexOf('#', last - 1);
  if (prev === -1) return t;
  const between = t.substring(prev + 1, last);
  if (!between.includes(' ')) {
    const before = t.slice(0, prev).trimEnd();
    const after = t.slice(last);
    return (before + ' ' + after).trim();
  }
  return t;
}

function ensureEndsWithSymbol(t: string, s: '@' | '#'): string {
  t = t.trimEnd();
  return t.endsWith(s) ? t : t + s;
}

export function removeAllInvalidMentionsWithSpaces(
  t: string,
  users: any[],
  chans: any[]
): string {
  let res = t;
  let start = 0;
  for (;;) {
    const idx = findNextSymbolIndex(res, start);
    if (idx === -1) break;
    const { updated, next } = processMentionBlock(res, idx, users, chans);
    res = updated;
    start = next;
  }
  return res.trim();
}

function processMentionBlock(
  txt: string,
  idx: number,
  users: any[],
  chans: any[]
) {
  const sym = txt[idx] as '@' | '#';
  const nx = findNextSymbolIndex(txt, idx + 1);
  const end = nx === -1 ? txt.length : nx;
  const block = txt.substring(idx, end).trimEnd();
  const valid = checkBlockValid(sym, block, users, chans);

  if (!valid) {
    const before = txt.slice(0, idx).trimEnd();
    const after = txt.slice(end).trimStart();
    const updated = (before + ' ' + after).trim();
    return { updated, next: idx };
  }
  return { updated: txt, next: end };
}

function checkBlockValid(
  sym: '@' | '#',
  block: string,
  users: any[],
  chans: any[]
): boolean {
  const name = block.substring(1).trim().toLowerCase();
  if (sym === '@')
    return users.some((u) => (u.name || '').toLowerCase() === name);
  return chans.some((c) => (c.name || '').toLowerCase() === name);
}

function findNextSymbolIndex(txt: string, from: number): number {
  const a = txt.indexOf('@', from);
  const h = txt.indexOf('#', from);
  if (a === -1 && h === -1) return -1;
  if (a === -1) return h;
  if (h === -1) return a;
  return Math.min(a, h);
}

function handleThreadChannelFilter(comp: ThreadComponent, t: string) {
  const pos = t.lastIndexOf('#');
  if (pos === -1) {
    resetDropdownComp(comp);
    return;
  }

  const sub = t
    .substring(pos + 1)
    .trim()
    .toLowerCase();
  if (sub.length === 0) {
    comp.allChannels = [...comp.allChannelsOriginal];
    return;
  }

  comp.allChannels = comp.allChannelsOriginal.filter((ch) =>
    ch.name?.toLowerCase().includes(sub)
  );
}

export const prepareChannelDropdown = (c: ThreadComponent): void => {
  const ta = c.textAreaRef?.nativeElement;
  if (!ta) return;

  const txt = buildChannelDropdownText(c, ta.value);
  applyChannelDropdownState(c, ta, txt);
};

const buildChannelDropdownText = (c: ThreadComponent, raw: string): string => {
  const cleaned = removeAllInvalidMentionsWithSpaces(
    raw,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  return ensureEndsWithSymbol(removePreviousHashWithoutSpace(cleaned), '#');
};

const applyChannelDropdownState = (
  c: ThreadComponent,
  ta: HTMLTextAreaElement,
  txt: string
): void => {
  ta.value = txt;
  c.privateMessage = txt;
  c.dropdownState = 'channel';
  c.lastOpenedChar = '#';
  c.allChannels = [...c.allChannelsOriginal];
  ta.setSelectionRange(txt.length, txt.length);
  ta.focus();
};

export const toggleDropdownComp = (c: ThreadComponent, e: MouseEvent): void => {
  e.stopPropagation();
  c.isEmojiPickerVisible = false;
  nextDropdownStep(c);
};

const nextDropdownStep = (c: ThreadComponent): void => {
  const step = c.cycleStep;
  step === 1
    ? openUserDropdown(c, 2)
    : step === 2
    ? openChannelDropdown(c, 3)
    : step === 3
    ? openUserDropdown(c, 4)
    : resetDropdown(c);
};

const openUserDropdown = (c: ThreadComponent, next: number): void => {
  prepareUserDropdown(c);
  c.cycleStep = next;
};

const openChannelDropdown = (c: ThreadComponent, next: number): void => {
  prepareChannelDropdown(c);
  c.cycleStep = next;
};

const resetDropdown = (c: ThreadComponent): void => {
  resetDropdownComp(c);
};

export const prepareUserDropdown = (c: ThreadComponent): void => {
  const ta = c.textAreaRef?.nativeElement;
  if (!ta) return;

  const txt = buildUserDropdownText(c, ta.value);
  applyUserDropdownState(c, ta, txt);
};

const buildUserDropdownText = (c: ThreadComponent, raw: string): string => {
  const cleaned = removeAllInvalidMentionsWithSpaces(
    raw,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  return ensureEndsWithSymbol(removePreviousAtWithoutSpace(cleaned), '@');
};

const applyUserDropdownState = (
  c: ThreadComponent,
  ta: HTMLTextAreaElement,
  txt: string
): void => {
  ta.value = txt;
  ta.setSelectionRange(txt.length, txt.length);
  c.privateMessage = txt;
  c.dropdownState = 'user';
  c.lastOpenedChar = '@';
  c.allUsers = [...c.allUsersOriginal];
  ta.focus();
};
