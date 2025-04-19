import { EntwicklerteamComponent } from './entwicklerteam.component'

export interface MyState extends EntwicklerteamComponent {}

export function unsubscribeFromBoth(c: MyState): void {
  if (c.unsubscribeTopLevel) {
    c.unsubscribeTopLevel.unsubscribe()
    c.unsubscribeTopLevel = undefined
  }
  if (c.unsubscribeSubCollection) {
    c.unsubscribeSubCollection.unsubscribe()
    c.unsubscribeSubCollection = undefined
  }
}

export function initChannel(c: MyState, ch: any): void {
  c.channels = [
    { id: ch.id, name: ch.name, members: ch.members, description: ch.description, createdBy: ch.createdBy || '' }
  ]
  c.channels = c.channels.map(x => x.id === ch.id ? { ...x, members: ch.members, name: ch.name } : x)
  c.selectedChannel = ch
  

  loadLastUsedEmojis(c, ch.id)
  setTimeout(() => {
    if (!c.dialog.openDialogs.length) c.onFocusTextArea()
  }, 0)
}

export function loadLastUsedEmojis(c: MyState, channelId: string): void {
  c.channelService.getLastUsedEmojis(channelId, 'sent').then(s => { c.lastUsedEmojisSent = s || [] })
  c.channelService.getLastUsedEmojis(channelId, 'received').then(r => { c.lastUsedEmojisReceived = r || [] })
}

export function connectReplyCountsToMessages(c: MyState, msgs: any[]): void {
  msgs.forEach(msg => {
    const tId = msg.threadId || msg.parentId || msg.id
    if (!tId) return
    c.messageService.loadReplyCountsLive([tId], 'thread-channel', rc => {
      const { count, lastResponseTime } = rc[tId] || { count: 0, lastResponseTime: null }
      msg.replyCount = count
      msg.threadLastResponseTime = lastResponseTime || msg.threadLastResponseTime
      if (msg.threadLastResponseTime) msg.lastReplyTime = new Date(msg.threadLastResponseTime)
    })
  })
}

export function findEmojiIndex(c: MyState, message: any, e: string): number {
  if (!message?.content?.emojis) return -1
  return message.content.emojis.findIndex((x: any) => x.emoji === e)
}

export function removeEmojiAtIndex(c: MyState, message: any, i: number): void {
  message.content.emojis.splice(i, 1)
}

export function updateMessageInFirestore(c: MyState, message: any): void {
  if (!message.id) {
    c.hideTooltip()
    return
  }
  c.messageService
    .updateMessage(message.id, { content: message.content })
    .then(() => c.hideTooltip())
    .catch(() => c.hideTooltip())
}

export function removeEmojiFromMessage(c: MyState, message: any, e: string): void {
  const i = findEmojiIndex(c, message, e)
  if (i === -1) return
  removeEmojiAtIndex(c, message, i)
  updateMessageInFirestore(c, message)
}
