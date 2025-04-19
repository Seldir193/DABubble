// search-field-base.ts
export class SearchFieldBase {
  searchQuery = '';
  filteredMembers: any[] = [];
  noResultsFound = false;
  imageUrl: string | ArrayBuffer | null = null;
  privateMessage = '';
  currentUser: any = null;
  privateMessages: any[] = [];
  conversationId?: string;
  recipientStatus = '';
  recipientAvatarUrl = '';
  isEmojiPickerVisible = false;
  isImageModalOpen = false;
  currentDate: Date = new Date();
  yesterdayDate: Date = this.getYesterdayDate();
  isTextareaExpanded = false;
  lastUsedEmojisReceived: string[] = [];
  lastUsedEmojisSent: string[] = [];
  showEditOptions = false;
  currentMessageId: string | null = null;
  originalMessage: any = null;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji = '';
  tooltipSenderName = '';
  selectedRecipients: any[] = [];
  messageToAll = 'An: #channel, oder @jemand';
  showAtDropdown = false;
  allMembers: any[] = [];
  isDesktop = false;
  placeholderText = '';
  filteredResults: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  allUsers: any[] = [];
  allChannels: any[] = [];

  getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
}
