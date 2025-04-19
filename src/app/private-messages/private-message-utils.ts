import { PrivateMessagesComponent } from './private-messages.component';
import { formatDate } from '@angular/common';

export async function sendPrivateMessageUtil(
  c: PrivateMessagesComponent,
  t: HTMLTextAreaElement
): Promise<void> {
  const { textBeforeClear, imageBeforeClear } = collectAndClearInputUtil(c, t);
  const { sid, cid } = prepareConversationUtil(c);
  if (!cid) return;
  const { timestamp, showDateSeparator, formattedDate } =
    prepareTimestampInfoUtil(c);
  const [senderName, senderAvatar] = await ensureSenderInfoUtil(c, sid);
  const tmpId = createTempMessageUtil(
    c,
    cid,
    sid,
    senderName,
    senderAvatar,
    timestamp,
    formattedDate,
    showDateSeparator,
    textBeforeClear,
    imageBeforeClear
  );
  c.scrollToBottomWrapper();
  await sendAndFinalizeUtil(
    c,
    cid,
    sid,
    tmpId,
    textBeforeClear,
    imageBeforeClear
  );
  postSendCleanupUtil(c);
}

function collectAndClearInputUtil(
  c: PrivateMessagesComponent,
  t: HTMLTextAreaElement
) {
  const text = c.privateMessage || '';
  const img = c.imageUrl;
  c.privateMessage = '';
  c.imageUrl = null;
  t.value = '';
  c.resetTextareaHeight(t);
  return { textBeforeClear: text, imageBeforeClear: img };
}

function prepareConversationUtil(c: PrivateMessagesComponent) {
  const sid = c.userService.getCurrentUserId();
  if (!sid || !c.recipientId) return { sid: '', cid: '' };
  const cid = c.messageService.generateConversationId(sid, c.recipientId);
  return { sid, cid };
}

function prepareTimestampInfoUtil(c: PrivateMessagesComponent) {
  const ts = new Date();
  const fmt = c.getFormattedDate(ts);
  let sep = false;
  if (c.privateMessages.length) {
    const last = c.privateMessages[c.privateMessages.length - 1];
    sep = !c.isSameDayWrapper(last.timestamp, ts);
  } else {
    sep = true;
  }
  return { timestamp: ts, showDateSeparator: sep, formattedDate: fmt };
}

async function ensureSenderInfoUtil(
  c: PrivateMessagesComponent,
  sId: string
): Promise<[string, string]> {
  let n = c.currentUser?.name || 'Unknown';
  let av = c.currentUser?.avatarUrl || 'assets/img/avatar.png';
  if (!n) {
    try {
      const ud = await c.userService.getUserById(sId);
      n = ud?.name || 'Unknown';
      av = ud?.avatarUrl || 'assets/img/avatar.png';
    } catch {}
  }
  return [n, av];
}

function generateTempIdUtil(): string {
  return `temp-${Math.random().toString(36).substr(2, 9)}`;
}

function buildMessageObjectUtil(
  t: string,
  cId: string,
  sid: string,
  sN: string,
  sA: string,
  d: Date,
  fD: string,
  sp: boolean,
  mT: string,
  mI: string | ArrayBuffer | null
) {
  return {
    id: t,
    content: { text: mT, image: typeof mI === 'string' ? mI : '', emojis: [] },
    timestamp: d,
    formattedDate: fD,
    showDateSeparator: sp,
    time: formatDate(d, 'HH:mm', 'de'),
    senderId: sid,
    senderName: sN,
    senderAvatar: sA,
    conversationId: cId,
  };
}

function pushMessageUtil(c: PrivateMessagesComponent, msgObj: any) {
  c.privateMessages = [...c.privateMessages, msgObj];
}

export function createTempMessageUtil(
  c: PrivateMessagesComponent,
  convId: string,
  sId: string,
  sName: string,
  sAvatar: string,
  ts: Date,
  fmtDate: string,
  sep: boolean,
  msgText: string,
  msgImage: string | ArrayBuffer | null
) {
  const tmp = generateTempIdUtil();
  const o = buildMessageObjectUtil(
    tmp,
    convId,
    sId,
    sName,
    sAvatar,
    ts,
    fmtDate,
    sep,
    msgText,
    msgImage
  );
  pushMessageUtil(c, o);
  return tmp;
}

async function sendAndFinalizeUtil(
  c: PrivateMessagesComponent,
  cid: string,
  sid: string,
  tmpId: string,
  txt: string,
  img: string | ArrayBuffer | null
) {
  try {
    const fsId = await c.messageService.sendMessage({
      type: 'private',
      conversationId: cid,
      content: {
        text: txt,
        image: typeof img === 'string' ? img : '',
        emojis: [],
      },
      senderId: sid,
      recipientId: c.recipientId,
    });
    c.privateMessages = c.privateMessages.map((m) =>
      m.id === tmpId ? { ...m, id: fsId } : m
    );
    await finalizeEmojisAndLoad(c, cid, fsId);
  } catch {}
}

async function finalizeEmojisAndLoad(
  c: PrivateMessagesComponent,
  cid: string,
  fsId: string
) {
  const saved = await c.messageService.getMessage('private', fsId);
  if (cid && saved?.content?.emojis?.length) {
    const arr = saved.content.emojis.map((x: { emoji: string }) => x.emoji);
    await c.messageService.saveLastUsedEmojis(cid, arr, 'sent');
  }
  await c.loadLastUsedEmojisWrapper();
  c.listenForEmojiUpdatesUtilWrapper();
}

function postSendCleanupUtil(c: PrivateMessagesComponent) {
  c.callUpdateMessageDates();
}
