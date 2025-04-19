/***** toggleDropdownUtil.ts *****/
import { PrivateMessagesComponent } from './private-messages.component';

export function toggleDropdownUtil(
  c: PrivateMessagesComponent,
  e: MouseEvent
): void {
  e.stopPropagation();
  if (c.cycleStep === 1) setUserState(c, 2);
  else if (c.cycleStep === 2) setChannelState(c, 3);
  else if (c.cycleStep === 3) setUserState(c, 4);
  else setHiddenState(c);
  if (c.dropdownState !== 'hidden') c.isEmojiPickerVisible = false;
}

function setUserState(c: PrivateMessagesComponent, s: number) {
  c.dropdownState = 'user';
  c.allUsers = [...c.allUsersOriginal];
  c.cycleStep = s;
}

function setChannelState(c: PrivateMessagesComponent, s: number) {
  c.dropdownState = 'channel';
  c.allChannels = [...c.allChannelsOriginal];
  c.cycleStep = s;
}

function setHiddenState(c: PrivateMessagesComponent) {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function closeDropdownUtil(c: PrivateMessagesComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function resetDropdownUtil(c: PrivateMessagesComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
  c.lastOpenedChar = '';
}

/***** addUserSymbolUtil.ts *****/
export function addUserSymbolUtil(c: PrivateMessagesComponent, m: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  txt = txt.trimEnd() + ` @${m.name} `;
  ta.value = txt;
  c.privateMessage = txt;
  resetDropdownUtil(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

/***** selectChannelUtil.ts *****/
export function selectChannelUtil(c: PrivateMessagesComponent, ch: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  txt = txt.trimEnd() + ` #${ch.name} `;
  ta.value = txt;
  c.privateMessage = txt;
  closeDropdownUtil(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

export function onTextareaInputUtil(
  c: PrivateMessagesComponent,
  e: Event
): void {
  const i = e as InputEvent;
  const ta = e.target as HTMLTextAreaElement;
  let t = ta.value;
  handleDelete(c, t, i);
  if (shouldHandleAt(c, t)) {
    handleAtBlock(c, ta, t);
    return;
  }
  if (shouldHandleHash(c, t)) {
    handleHashBlock(c, ta, t);
    return;
  }
  handleInputDefault(c, t);
}

function handleAtBlock(
  c: PrivateMessagesComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  t = removeAllInvalidMentionsWithSpaces(
    t,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  t = removePreviousAtWithoutSpace(t);
  t = ensureEndsWithSymbol(t, '@');
  finalizeAtInput(c, ta, t);
}

function handleHashBlock(
  c: PrivateMessagesComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  t = removeAllInvalidMentionsWithSpaces(
    t,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  t = removePreviousHashWithoutSpace(t);
  t = ensureEndsWithSymbol(t, '#');
  finalizeHashInput(c, ta, t);
}

function handleInputDefault(c: PrivateMessagesComponent, t: string) {
  c.lastOpenedChar = '';
  if (c.dropdownState === 'user') handleUserFilter(c, t);
  else if (c.dropdownState === 'channel') handleChannelFilter(c, t);
  else resetDropdownUtil(c);
}

/***** helperOnTextarea.ts *****/
function handleDelete(c: PrivateMessagesComponent, t: string, i: InputEvent) {
  if (
    i.inputType !== 'deleteContentBackward' &&
    i.inputType !== 'deleteContentForward'
  )
    return;
  if (!t.includes('@') && c.dropdownState === 'user') resetDropdownUtil(c);
  if (!t.includes('#') && c.dropdownState === 'channel') resetDropdownUtil(c);
}

function shouldHandleAt(c: PrivateMessagesComponent, t: string) {
  return t.endsWith('@') && c.lastOpenedChar !== '@';
}

function shouldHandleHash(c: PrivateMessagesComponent, t: string) {
  return t.endsWith('#') && c.lastOpenedChar !== '#';
}

function finalizeAtInput(
  c: PrivateMessagesComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.privateMessage = t;
  c.dropdownState = 'user';
  c.lastOpenedChar = '@';
  c.allUsers = [...c.allUsersOriginal];
}

function finalizeHashInput(
  c: PrivateMessagesComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.privateMessage = t;
  c.dropdownState = 'channel';
  c.lastOpenedChar = '#';
  c.allChannels = [...c.allChannelsOriginal];
}

function handleUserFilter(c: PrivateMessagesComponent, t: string) {
  const pos = t.lastIndexOf('@');
  if (pos === -1) {
    resetDropdownUtil(c);
    return;
  }
  c.allUsers = [...c.allUsersOriginal];
  const sub = t
    .substring(pos + 1)
    .trim()
    .toLowerCase();
  if (sub.length > 0) {
    c.allUsers = c.allUsers.filter((u) => u.name?.toLowerCase().includes(sub));
  }
}

function handleChannelFilter(c: PrivateMessagesComponent, t: string) {
  const pos = t.lastIndexOf('#');
  if (pos === -1) {
    resetDropdownUtil(c);
    return;
  }
  c.allChannels = [...c.allChannelsOriginal];
  const sub = t
    .substring(pos + 1)
    .trim()
    .toLowerCase();
  if (sub.length > 0) {
    c.allChannels = c.allChannels.filter((ch) =>
      ch.name?.toLowerCase().includes(sub)
    );
  }
}

/***** removePrevious.ts *****/
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

/***** ensureEndsWithSymbol.ts *****/
function ensureEndsWithSymbol(t: string, s: '@' | '#'): string {
  t = t.trimEnd();
  if (!t.endsWith(s)) t += s;
  return t;
}

/***** removeAllInvalid.ts *****/
function removeAllInvalidMentionsWithSpaces(
  t: string,
  u: any[],
  c: any[]
): string {
  let r = t;
  let start = 0;
  for (;;) {
    const i = findNextSymbolIndex(r, start);
    if (i === -1) break;
    const o = processMentionBlock(r, i, u, c);
    r = o.updated;
    start = o.next;
  }
  return r.trim();
}

function processMentionBlock(r: string, idx: number, us: any[], chs: any[]) {
  const sym = r[idx] as '@' | '#';
  const nx = findNextSymbolIndex(r, idx + 1);
  const end = nx === -1 ? r.length : nx;
  const block = r.substring(idx, end).trimEnd();
  const valid = checkBlockValid(sym, block, us, chs);
  if (!valid) {
    const b = r.slice(0, idx).trimEnd();
    const a = r.slice(end).trimStart();
    const updated = (b + ' ' + a).trim();
    return { updated, next: idx };
  }
  return { updated: r, next: end };
}

function checkBlockValid(
  s: '@' | '#',
  block: string,
  u: any[],
  c: any[]
): boolean {
  const name = block.substring(1).trim();
  if (s === '@') {
    return u.some((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  }
  return c.some((x) => (x.name || '').toLowerCase() === name.toLowerCase());
}

/***** findNextSymbolIndex.ts *****/
function findNextSymbolIndex(t: string, from: number): number {
  const a = t.indexOf('@', from);
  const h = t.indexOf('#', from);
  if (a === -1 && h === -1) return -1;
  if (a === -1) return h;
  if (h === -1) return a;
  return Math.min(a, h);
}
