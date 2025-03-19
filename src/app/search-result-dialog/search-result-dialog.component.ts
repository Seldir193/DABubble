/**
 * The SelectResultDialogComponent is a Material Dialog
 * displaying a list of search results (users, channels, messages, threads).
 * Depending on the selected result type, it triggers the appropriate
 * navigation or data loading (e.g., opening private chat, channel messages,
 * or thread details). No logic or styling has been changed – only these
 * English JSDoc comments have been added.
 */

import {
  Component,
  Inject,
  OnInit,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { MessageService } from '../message.service';
import { getAuth } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core';

/**
 * SelectResultDialogData is the structure of the data passed to this dialog,
 * containing search results array.
 */
export interface SelectResultDialogData {
  results: any[];
}

/**
 * The SelectResultDialogComponent shows a list of search results and manages
 * user selection, message navigation, channel loading, and thread access.
 */
@Component({
  selector: 'app-select-result-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-result-dialog.component.html',
  styleUrls: ['./search-result-dialog.component.scss'],
})
export class SelectResultDialogComponent implements OnInit {
  /**
   * resultSelected: emits an event when a result is selected (may not be used if direct logic calls).
   */
  @Output() resultSelected = new EventEmitter<any>();

  /**
   * navigateToMessage: emits an event to navigate to a specific message
   * (e.g. open a private chat, highlight a message, or open a thread).
   */
  @Output() navigateToMessage = new EventEmitter<any>();

  /**
   * For referencing a selected channel or passing channel data (if needed).
   */
  @Input() selectedChannel: any;

  /**
   * Emitted when a thread is opened or selected.
   */
  @Output() openThread = new EventEmitter<any>();
  @Output() threadSelected = new EventEmitter<any>();
  @Output() threadChannelSelected = new EventEmitter<any>();

  /**
   * The array of search results to display in this dialog.
   */
  results: any[] = [];

  /**
   * Arrays to hold channel or private messages if needed.
   */
  channelMessages: any[] = [];
  privateMessages: any[] = [];

  /**
   * Tracks replyCount, parentMessage, or any thread details if needed.
   */
  replyCount: number = 0;
  parentMessage: any = {};

  /**
   * Flag preventing repeated scrolling to a specific message.
   */

  /**
   * The constructor injects channel service, user service, message service,
   * and the Material Dialog references, plus any data passed in via MAT_DIALOG_DATA.
   *
   * @param {ChannelService} channelService - For loading channel messages.
   * @param {UserService} userService - For user status or real-time updates.
   * @param {MessageService} messageService - For message logic (threads, private messages).
   * @param {ChangeDetectorRef} cdr - Triggers manual change detection if needed.
   * @param {MatDialogRef<SelectResultDialogComponent>} dialogRef - Reference to close the dialog.
   * @param {SelectResultDialogData} data - The results to display in this dialog.
   */
  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: SelectResultDialogData,
    public dialogRef: MatDialogRef<SelectResultDialogComponent>
  ) {
    this.data.results = this.data.results || [];
  }

  /**
   * Lifecycle hook. Logs the incoming results, sets up a real-time user status update,
   * and optionally formats timestamps for display.
   */
  ngOnInit(): void {
    this.userService.getAllUsersRealTime((users) => {
      this.updateResultStatus(users);
    });

    // Format any Firestore-based timestamp into a Date for display
    this.data.results = this.data.results.map((result) => {
      if (result.timestamp && result.timestamp.seconds) {
        return {
          ...result,
          formattedTimestamp: new Date(result.timestamp.seconds * 1000),
        };
      }
      return result;
    });
  }

  /**
   * updateResultStatus checks each result for an 'isOnline' property
   * and updates it by matching user data from Firestore in real time.
   */
  updateResultStatus(users: any[] | undefined): void {
    if (!users || !Array.isArray(users)) {
      return;
    }

    if (!this.data || !this.data.results || !Array.isArray(this.data.results)) {
      this.data = { results: [] };
      return;
    }

    this.data.results = this.data.results.map((result) => {
      if (result.hasOwnProperty('isOnline')) {
        const userFromFirestore = users.find((u: any) => u.id === result.id);
        return { ...result, isOnline: userFromFirestore?.isOnline ?? false };
      }
      return result;
    });
  }

  /**
   * Called when the user clicks on a specific result.
   * It determines the type of the result and triggers logic for user, channel,
   * message, thread, or thread-channel.
   */
  selectResult(result: any): void {
    const currentUser = this.getCurrentUserOrReturn();
    if (!currentUser) {
      return;
    }

    const updatedResult = this.preparePrivateMessageIfNeeded(
      result,
      currentUser.uid
    );
    if (!updatedResult) {
      return;
    }

    // 3) Baue ggf. threadData
    const threadData = this.buildThreadData(updatedResult);

    this.handleResultType(updatedResult, threadData, currentUser.uid);
  }

  /**
   * Returns the current user from Firebase Auth or null if not logged in.
   */
  private getCurrentUserOrReturn(): any {
    const auth = getAuth();
    return auth.currentUser || null;
  }

  /**
   * If the result is a private-message, adjust conversationId, fetch name if missing,
   * and possibly return 'null' if we are still loading the user name.
   */
  private preparePrivateMessageIfNeeded(
    result: any,
    currentUserId: string
  ): any {
    if (result.type !== 'private-message') {
      return result;
    }

    const chatPartnerId =
      result.senderId === currentUserId ? result.recipientId : result.senderId;

    const updatedResult = {
      ...result,
      recipientName: result.recipientName || 'Loading name...',
      recipientId: chatPartnerId,
      conversationId:
        result.conversationId || `${currentUserId}_${chatPartnerId}`,
    };

    if (
      !updatedResult.recipientName ||
      updatedResult.recipientName === 'Loading name...'
    ) {
      this.userService.getUserById(chatPartnerId).then((user) => {
        updatedResult.recipientName = user?.name || 'Unknown';
        this.navigateToMessage.emit(updatedResult);
        this.dialogRef.close();
      });
      return null;
    }

    return updatedResult;
  }

  /**
   * Builds an object with thread-related data if the result might be a thread.
   */
  private buildThreadData(result: any): any {
    return {
      ...result,
      senderId: result.senderId,
      senderName: result.senderName,
      conversationId: result.conversationId,
    };
  }

  /**
   * Decides what to do based on the 'type' property in result (user, channel, message, etc.).
   */
  private handleResultType(
    result: any,
    threadData: any,
    currentUserId: string
  ): void {
    switch (result.type) {
      case 'user':
        this.handleUserSelection(result, currentUserId);
        break;

      case 'channel':
        this.loadChannelMessages(result.id);
        this.dialogRef.close(result);
        break;

      case 'message':
      case 'private-message':
        this.navigateToMessage.emit(result);
        this.dialogRef.close();
        break;

      case 'thread':
        this.navigateToMessage.emit(threadData);
        this.dialogRef.close();
        this.handleThreadNavigation(threadData);
        break;

      case 'thread-channel':
        this.navigateToMessage.emit(result);
        this.threadChannelSelected.emit(result);
        this.dialogRef.close();
        this.handleThreadChannelNavigation(result);
        break;

      default:
    }
  }

  /**
   * Specific logic for "thread-channel" results, loading messages
   * from Firestore if needed.
   */
  private handleThreadChannelNavigation(result: any): void {
    const threadChannelId = this.getThreadChannelId(result);
    if (!threadChannelId) return;

    this.loadThreadChannelData(threadChannelId, result.id).catch((error) =>
      console.error('Error:', error)
    );
  }

  /**
   * Determines the channel ID by checking threadChannelId, parentId, or id.
   */
  private getThreadChannelId(result: any): string | null {
    return result.threadChannelId || result.parentId || result.id || null;
  }

  /**
   * Loads all messages once for 'thread-channel', finds the specific message,
   * and if certain fields are missing, fetches the full data from Firestore.
   */
  private async loadThreadChannelData(
    threadChannelId: string,
    resultId: string
  ): Promise<void> {
    const messages = await this.messageService.getMessagesOnce(
      'thread-channel',
      threadChannelId
    );
    const foundMessage = messages.find((m: any) => m.id === resultId);

    if (!foundMessage) return;

    if (this.fieldsAreMissing(foundMessage)) {
      this.fetchFullThreadChannelMessage(foundMessage);
    } else {
      // e.g. fields are already complete
    }
  }

  /**
   * Checks whether crucial fields (senderName, senderAvatar, content.text, timestamp) are missing.
   */
  private fieldsAreMissing(msg: any): boolean {
    return (
      !msg.senderName ||
      !msg.senderAvatar ||
      !msg.content?.text ||
      !msg.timestamp
    );
  }

  /**
   * Fetches a single message from Firestore to complete missing fields,
   * then merges data. You could store the result in this.selectedThreadChannel, etc.
   */
  private fetchFullThreadChannelMessage(foundMessage: any): void {
    this.messageService
      .getMessage('thread-channel', foundMessage.id)
      .then((fullMsg) => {
        if (fullMsg) {
          const merged = { ...foundMessage, ...fullMsg };
          // e.g. this.selectedThreadChannel = merged;
        } else {
          // No message found
        }
      });
  }

  /**
   * Specific logic for "thread" results, loading all thread messages once
   * and merging if needed.
   */
  private handleThreadNavigation(result: any): void {
    const threadId = this.getThreadId(result);
    if (!threadId) return;

    this.loadThreadMessages(threadId, result.id).catch((e) =>
      console.error('Error:', e)
    );
  }

  /**
   * Determines the thread ID by checking threadId, parentId, or id.
   */
  private getThreadId(result: any): string | null {
    return result.threadId || result.parentId || result.id || null;
  }

  /**
   * Loads thread messages once, finds the specific message, and
   * if crucial fields are missing, fetches the full data before emitting 'threadSelected'.
   */
  private async loadThreadMessages(
    threadId: string,
    messageId: string
  ): Promise<void> {
    const messages = await this.messageService.getMessagesOnce(
      'thread',
      threadId
    );
    const foundMessage = messages.find((m: any) => m.id === messageId);

    if (!foundMessage) {
      // Removed console.warn
      return;
    }

    if (this.fieldsAreMissing(foundMessage)) {
      this.fetchFullThreadMessage(threadId, messageId, foundMessage);
    } else {
      // Already complete
      this.emitThreadSelected(threadId, messageId, foundMessage);
    }
  }

  /**
   * Fetches a single message from Firestore, merges with the found message,
   * and then emits 'threadSelected'.
   */
  private fetchFullThreadMessage(
    threadId: string,
    messageId: string,
    foundMessage: any
  ): void {
    this.messageService
      .getMessage('thread', foundMessage.id)
      .then((fullMsg) => {
        if (fullMsg) {
          const merged = { ...foundMessage, ...fullMsg };
          this.emitThreadSelected(threadId, messageId, merged);
        } else {
          // No data found
        }
      });
  }

  /**
   * Emits the 'threadSelected' event with the updated message data.
   */
  private emitThreadSelected(
    threadId: string,
    messageId: string,
    messageData: any
  ): void {
    this.threadSelected.emit({
      id: threadId,
      messageId,
      messageData,
    });
  }

  /**
   * scrollToMessage tries to scroll the view to a particular message
   * by ID. It attempts multiple times if needed.
   */
  scrollToMessage(messageId: string, retries = 15): void {
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        this.scrollToMessage(messageId, retries - 1);
      }
    }, 300);
  }

  /**
   * handleUserSelection is called when the result type is 'user'.
   * It may load or navigate private messages, etc.
   */
  private handleUserSelection(result: any, currentUserId: string) {
    const conversationId = this.messageService.generateConversationId(
      currentUserId,
      result.id
    );

    this.messageService
      .getMessagesOnce('private', conversationId)
      .then((messages) => {
        this.privateMessages = messages;
        this.dialogRef.close(result);
      })
      .catch(() => {});
  }

  /**
   * loadChannelMessages retrieves the channel messages by ID,
   * storing them in channelMessages array.
   */
  loadChannelMessages(channelId: string): void {
    this.channelService.getMessages(channelId).subscribe(
      (messages) => {
        this.channelMessages = messages;
      },
      () => {}
    );
  }

  /**
   * Cancels (closes) the dialog without selecting any result.
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
