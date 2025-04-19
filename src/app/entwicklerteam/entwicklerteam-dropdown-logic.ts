import { EntwicklerteamComponent } from './entwicklerteam.component';

export function toggleDropdown(
  c: EntwicklerteamComponent,
  e: MouseEvent
): void {
  e.stopPropagation();
  if (c.cycleStep === 1) setUserState(c, 2);
  else if (c.cycleStep === 2) setChannelState(c, 3);
  else if (c.cycleStep === 3) setUserState(c, 4);
  else setHiddenState(c);
  if (c.dropdownState !== 'hidden') c.isEmojiPickerVisible = false;
}

function setUserState(c: EntwicklerteamComponent, s: number) {
  c.dropdownState = 'user';
  c.allUsers = [...c.allUsersOriginal];
  c.cycleStep = s;
}

function setChannelState(c: EntwicklerteamComponent, s: number) {
  c.dropdownState = 'channel';
  c.allChannels = [...c.allChannelsOriginal];
  c.cycleStep = s;
}

function setHiddenState(c: EntwicklerteamComponent) {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function closeDropdown(c: EntwicklerteamComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function resetDropdown(c: EntwicklerteamComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
  c.lastOpenedChar = '';
}

/***** addUserSymbolUtil.ts *****/
export function addUserSymbolUtil(c: EntwicklerteamComponent, m: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  txt = txt.trimEnd() + ` @${m.name} `;
  ta.value = txt;
  c.message = txt;
  resetDropdown(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

/***** selectChannelUtil.ts *****/
export function selectChannelUtil(c: EntwicklerteamComponent, ch: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );
  txt = txt.trimEnd() + ` #${ch.name} `;
  ta.value = txt;
  c.message = txt;
  closeDropdown(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

export function onTextareaInput(c: EntwicklerteamComponent, e: Event): void {
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
  c: EntwicklerteamComponent,
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
  c: EntwicklerteamComponent,
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

function handleInputDefault(c: EntwicklerteamComponent, t: string) {
  c.lastOpenedChar = '';
  if (c.dropdownState === 'user') handleUserFilter(c, t);
  else if (c.dropdownState === 'channel') handleChannelFilter(c, t);
  else resetDropdown(c);
}

/***** helperOnTextarea.ts *****/
function handleDelete(c: EntwicklerteamComponent, t: string, i: InputEvent) {
  if (
    i.inputType !== 'deleteContentBackward' &&
    i.inputType !== 'deleteContentForward'
  )
    return;
  if (!t.includes('@') && c.dropdownState === 'user') resetDropdown(c);
  if (!t.includes('#') && c.dropdownState === 'channel') resetDropdown(c);
}

function shouldHandleAt(c: EntwicklerteamComponent, t: string) {
  return t.endsWith('@') && c.lastOpenedChar !== '@';
}

function shouldHandleHash(c: EntwicklerteamComponent, t: string) {
  return t.endsWith('#') && c.lastOpenedChar !== '#';
}

function finalizeAtInput(
  c: EntwicklerteamComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.message = t;
  c.dropdownState = 'user';
  c.lastOpenedChar = '@';
  c.allUsers = [...c.allUsersOriginal];
}

function finalizeHashInput(
  c: EntwicklerteamComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.message = t;
  c.dropdownState = 'channel';
  c.lastOpenedChar = '#';
  c.allChannels = [...c.allChannelsOriginal];
}

function handleUserFilter(c: EntwicklerteamComponent, t: string) {
  const pos = t.lastIndexOf('@');
  if (pos === -1) {
    resetDropdown(c);
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

function handleChannelFilter(c: EntwicklerteamComponent, t: string) {
  const pos = t.lastIndexOf('#');
  if (pos === -1) {
    resetDropdown(c);
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
export function removeAllInvalidMentionsWithSpaces(
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
