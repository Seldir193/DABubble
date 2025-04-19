import { ThreadChannelComponent } from './thread-channel.component';

export function toggleDropdownHelper(
  c: ThreadChannelComponent,
  e: MouseEvent
): void {
  e.stopPropagation();
  if (c.cycleStep === 1) setThreadUserState(c, 2);
  else if (c.cycleStep === 2) setThreadChannelState(c, 3);
  else if (c.cycleStep === 3) setThreadUserState(c, 4);
  else setThreadHiddenState(c);

  if (c.dropdownState !== 'hidden') {
    c.isEmojiPickerVisible = false;
  }
}

function setThreadUserState(c: ThreadChannelComponent, s: number) {
  c.dropdownState = 'user';
  c.allUsers = [...c.allUsersOriginal];
  c.cycleStep = s;
}

function setThreadChannelState(c: ThreadChannelComponent, s: number) {
  c.dropdownState = 'channel';
  c.allChannels = [...c.allChannelsOriginal];
  c.cycleStep = s;
}

function setThreadHiddenState(c: ThreadChannelComponent) {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function closeDropdownHelper(c: ThreadChannelComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
}

export function resetDropdownHelper(c: ThreadChannelComponent): void {
  c.dropdownState = 'hidden';
  c.cycleStep = 1;
  c.lastOpenedChar = '';
}

export function addUserSymbolThread(c: ThreadChannelComponent, m: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );

  txt = txt.trimEnd() + ` @${m.name} `;
  ta.value = txt;
  c.channelMessage = txt;
  resetDropdownHelper(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

export function selectChannelThread(c: ThreadChannelComponent, ch: any): void {
  const ta = c.textAreaRef.nativeElement;
  let txt = ta.value;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    c.allUsersOriginal,
    c.allChannelsOriginal
  );

  txt = txt.trimEnd() + ` #${ch.name} `;
  ta.value = txt;
  c.channelMessage = txt;
  closeDropdownHelper(c);
  const pos = txt.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

function handleThreadUserFilter(c: ThreadChannelComponent, t: string) {
  const pos = t.lastIndexOf('@');
  if (pos === -1) {
    resetDropdownHelper(c);
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

export function onTextareaInputHelper(
  c: ThreadChannelComponent,
  e: Event
): void {
  const i = e as InputEvent;
  const ta = e.target as HTMLTextAreaElement;
  let t = ta.value;

  handleThreadDelete(c, t, i);

  if (shouldHandleThreadAt(c, t)) {
    handleThreadAtBlock(c, ta, t);
    return;
  }
  if (shouldHandleThreadHash(c, t)) {
    handleThreadHashBlock(c, ta, t);
    return;
  }
  handleThreadInputDefault(c, t);
}

function handleThreadChannelFilter(c: ThreadChannelComponent, t: string) {
  const pos = t.lastIndexOf('#');
  if (pos === -1) {
    resetDropdownHelper(c);
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

function handleThreadDelete(
  c: ThreadChannelComponent,
  t: string,
  i: InputEvent
) {
  if (
    i.inputType !== 'deleteContentBackward' &&
    i.inputType !== 'deleteContentForward'
  ) {
    return;
  }
  if (!t.includes('@') && c.dropdownState === 'user') {
    resetDropdownHelper(c);
  }
  if (!t.includes('#') && c.dropdownState === 'channel') {
    resetDropdownHelper(c);
  }
}

function shouldHandleThreadAt(c: ThreadChannelComponent, t: string) {
  return t.endsWith('@') && c.lastOpenedChar !== '@';
}

function shouldHandleThreadHash(c: ThreadChannelComponent, t: string) {
  return t.endsWith('#') && c.lastOpenedChar !== '#';
}

function handleThreadAtBlock(
  c: ThreadChannelComponent,
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
  finalizeThreadAtInput(c, ta, t);
}

function handleThreadHashBlock(
  c: ThreadChannelComponent,
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
  finalizeThreadHashInput(c, ta, t);
}

function handleThreadInputDefault(c: ThreadChannelComponent, t: string) {
  c.lastOpenedChar = '';
  if (c.dropdownState === 'user') handleThreadUserFilter(c, t);
  else if (c.dropdownState === 'channel') handleThreadChannelFilter(c, t);
  else resetDropdownHelper(c);
}

function finalizeThreadAtInput(
  c: ThreadChannelComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.channelMessage = t;
  c.dropdownState = 'user';
  c.lastOpenedChar = '@';
  c.allUsers = [...c.allUsersOriginal];
}

function finalizeThreadHashInput(
  c: ThreadChannelComponent,
  ta: HTMLTextAreaElement,
  t: string
) {
  ta.value = t;
  c.channelMessage = t;
  c.dropdownState = 'channel';
  c.lastOpenedChar = '#';
  c.allChannels = [...c.allChannelsOriginal];
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
  if (!t.endsWith(s)) t += s;
  return t;
}

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
    return u.some(
      (x: any) => (x.name || '').toLowerCase() === name.toLowerCase()
    );
  }
  return c.some(
    (x: any) => (x.name || '').toLowerCase() === name.toLowerCase()
  );
}

function findNextSymbolIndex(t: string, from: number): number {
  const a = t.indexOf('@', from);
  const h = t.indexOf('#', from);
  if (a === -1 && h === -1) return -1;
  if (a === -1) return h;
  if (h === -1) return a;
  return Math.min(a, h);
}
