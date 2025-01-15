import {
  Component,
  OnInit,
  OnChanges,
  Input,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnDestroy,
} from '@angular/core';
import { MessageService, Message } from '../message.service';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared';
import { Timestamp } from 'firebase/firestore';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MessageDialogComponent } from '../message-dialog/message-dialog.component';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { ReactionDialogComponent } from '../reaction-dialog/reaction-dialog.component'; // Import ReactionDialogComponent

/**
 * Component for displaying and managing chat messages.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    NgStyle,
    MatIconModule,
    MatButtonModule,
    SharedModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent
  implements OnInit, OnChanges, AfterViewChecked, OnDestroy
{
  /**
   * Observable that emits an array of messages.
   */
  messages$!: Observable<Message[]>;

  /**
   * The new message being composed by the user.
   */
  newMessage = '';

  /**
   * The ID of the currently selected chat.
   */
  @Input() selectedChatId: string = 'test-chat';

  /**
   * The ID of the current user.
   */
  currentUserId: string | undefined;

  /**
   * Reference to the scrollable container for messages.
   */
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  /**
   * The selected file for upload.
   */
  selectedFile: File | null = null;

  /**
   * URL of the selected file for preview.
   */
  fileUrl: SafeUrl | null = null;

  /**
   * Name of the selected file.
   */
  fileName: string | null = null;
  /**
   * The message that is currently being edited.
   */
  editingMessage: Message | null = null;

  /**
   * The content of the message that is currently being edited.
   */
  editedMessageContent = '';

  /**
   * Subscription to the auth user observable.
   */
  private authSubscription?: Subscription;

  /**
   * Array of predefined emojis for reactions.
   */
  readonly emojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  /**
   * Reference to the message menu trigger.
   */
  @ViewChild('messageMenuTrigger') messageMenuTrigger!: MatMenuTrigger;

  /**
   * Constructor for ChatComponent.
   * @param {MessageService} messageService - Service for managing messages.
   * @param {AuthService} auth - Service for handling user authentication.
   * @param {DomSanitizer} sanitizer - Service for sanitizing URLs.
   */
  constructor(
    private messageService: MessageService,
    public auth: AuthService,
    private sanitizer: DomSanitizer,
    public dialog: MatDialog
  ) {
    this.logComponentInitialization();
  }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   */
  ngOnInit(): void {
    this.subscribeToAuthUser();
    this.logNgOnInit();
  }

  /**
   * Lifecycle hook that is called when the component's inputs change.
   * @param {SimpleChanges} changes - Object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChatId']) {
      this.handleSelectedChatIdChange(changes['selectedChatId'].currentValue);
    }
  }

  /**
   * Lifecycle hook that is called after the component's view has been checked.
   */
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  /**
   * Logs the initialization of the component.
   */
  private logComponentInitialization(): void {
    console.log('ChatComponent initialized');
  }

  /**
   * Logs the ngOnInit lifecycle hook.
   */
  private logNgOnInit(): void {
    console.log('ChatComponent ngOnInit called');
  }

  /**
   * Handles the change of the selected chat ID.
   * @param {string} chatId - The new selected chat ID.
   */
  private handleSelectedChatIdChange(chatId: string): void {
    this.logSelectedChatIdChange(chatId);
    this.loadMessages(chatId);
  }

  /**
   * Logs when the selected chat ID changes.
   * @param {string} chatId - The new selected chat ID.
   */
  private logSelectedChatIdChange(chatId: string): void {
    console.log(
      'ChatComponent ngOnChanges called with selectedChatId:',
      chatId
    );
  }

  /**
   * Loads the messages for the given chat ID.
   * @param {string} chatId - The ID of the chat to load messages for.
   */
  private loadMessages(chatId: string): void {
    this.logLoadMessages(chatId);
    this.messages$ = this.messageService.getMessages(chatId);
  }

  /**
   * Logs when the loadMessages method is called.
   * @param {string} chatId - The ID of the chat to load messages for.
   */
  private logLoadMessages(chatId: string): void {
    console.log('ChatComponent loadMessages called with chatId:', chatId);
  }

  /**
   * Scrolls the chat window to the bottom.
   */
  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Handle scroll errors silently
    }
  }

  /**
   * Sends a new message.
   */
  sendMessage(): void {
    if (this.isMessageValid()) {
      this.sendChatMessage(this.selectedChatId);
    }
  }

  /**
   * Checks if a message is valid (not empty text or selected file).
   * @returns {boolean} True if the message is valid, false otherwise.
   */
  private isMessageValid(): boolean {
    return this.newMessage.trim() !== '' || this.selectedFile !== null;
  }

  /**
   * Sends the chat message using the MessageService.
   */
  private sendChatMessage(selectedChatId: string): void {
    this.messageService
      .sendMessage(selectedChatId, this.newMessage, this.selectedFile)
      .then(() => {
        this.resetMessageInput();
      })
      .catch((error) => {
        console.error('Error sending message: ', error);
      });
  }

  /**
   * Resets the message input fields.
   */
  private resetMessageInput(): void {
    this.newMessage = '';
    this.selectedFile = null;
    this.fileUrl = null;
    this.fileName = null;
  }

  /**
   * Handles the selection of a file for upload.
   * @param {any} event - The file input event.
   */
  onFileSelected(event: any): void {
    this.handleFileSelection(event.target.files[0]);
  }

  /**
   * Handles the file selection and updates the component's state.
   * @param {File} file - The selected file.
   */
  private handleFileSelection(file: File): void {
    this.selectedFile = file;
    if (this.selectedFile) {
      this.fileUrl = this.sanitizeFileUrl(this.selectedFile);
      this.fileName = this.selectedFile.name;
      this.logSelectedFile();
    } else {
      this.resetFileSelection();
    }
  }

  /**
   * Sanitizes the file URL for preview.
   * @param {File} file - The file to create a URL for.
   * @returns {SafeUrl} The sanitized URL.
   */
  private sanitizeFileUrl(file: File): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
  }

  /**
   * Logs the selected file information.
   */
  private logSelectedFile(): void {
    console.log('Selected file:', this.selectedFile);
    console.log('Selected file url:', this.fileUrl);
  }

  /**
   * Resets the file selection state.
   */
  private resetFileSelection(): void {
    this.fileUrl = null;
    this.fileName = null;
  }

  /**
   * Subscribes to the auth user observable to keep track of current user.
   */
  private subscribeToAuthUser(): void {
    this.authSubscription = this.auth.user.subscribe((user) => {
      this.currentUserId = user?.uid;
    });
  }
  /**
   * Switches the current user using the AuthService.
   */
  switchUser(): void {
    this.auth.switchUser();
  }
  /**
   * Toggles the edit mode for a message.
   * @param {Message} message - The message to toggle.
   */
  toggleEditMessage(message: Message): void {
    if (message.senderId !== this.currentUserId) {
      console.log('You are not allowed to edit this message');
      return;
    }
    this.editingMessage =
      this.editingMessage?.id === message.id ? null : message;
    this.editedMessageContent = message.content;
  }
  /**
   * Updates a message in Firestore and resets editing mode.
   * @param {Message} message - The message to update.
   */
  updateMessage(message: Message): void {
    if (message.senderId !== this.currentUserId) {
      console.log('You are not allowed to edit this message');
      return;
    }
    if (this.editingMessage) {
      this.editingMessage = null;
      this.messageService
        .updateMessage(this.selectedChatId, {
          ...message,
          content: this.editedMessageContent,
          deleted: false,
        })
        .then(() => {
          this.logUpdateMessageSuccess(message.id!);
        })
        .catch((error) => {
          this.logUpdateMessageError(message.id!, error);
        });
    }
  }
  /**
   * Logs that a message was successfully updated
   * @param {string} messageId - The id of the message that was updated
   */
  private logUpdateMessageSuccess(messageId: string) {
    console.log('Message was successfully updated with ID: ', messageId);
  }
  /**
   * Logs that a message was not successfully updated
   * @param {string} messageId - The id of the message that was not updated
   * @param {any} error - the error that was thrown
   */
  private logUpdateMessageError(messageId: string, error: any) {
    console.log('Error updating message with ID: ', messageId, error);
  }
  /**
   * Deletes a file from a message by setting the fileDeleted flag to true.
   * @param {Message} message - The message containing the file to delete.
   */
  deleteFile(message: Message): void {
    if (message.senderId !== this.currentUserId) {
      console.log('You are not allowed to delete this file');
      return;
    }
    if (message.id && this.selectedChatId) {
      this.logDeleteFile(message.id);
      this.messageService
        .updateMessage(this.selectedChatId, { ...message, fileDeleted: true })
        .then(() => {
          this.logFileDeletionSuccess(message.id!);
        })
        .catch((error) => {
          this.logFileDeletionError(message.id!, error);
        });
    }
  }
  /**
   * Logs that a delete file action was triggered.
   * @param {string} messageId - The id of the message that will be deleted
   */
  private logDeleteFile(messageId: string) {
    console.log('Delete file called with ID: ', messageId);
  }
  /**
   * Logs that a file was successfully deleted
   * @param {string} messageId - The id of the message that was deleted
   */
  private logFileDeletionSuccess(messageId: string) {
    console.log('File was successfully deleted with ID: ', messageId);
  }
  /**
   * Logs that a file was not successfully deleted
   * @param {string} messageId - The id of the message that was not deleted
   * @param {any} error - the error that was thrown
   */
  private logFileDeletionError(messageId: string, error: any) {
    console.log('Error deleting file with ID: ', messageId, error);
  }
  /**
   * Opens a message dialog to edit or delete a message.
   * @param {Message} message - The message to edit.
   */
  openMessageDialog(message: Message): void {
    if (message.senderId !== this.currentUserId) {
      console.log('You are not allowed to edit this message');
      return;
    }
    this.logOpenMessageDialog(message.id!);
    const dialogRef = this.dialog.open(MessageDialogComponent, {
      width: '500px',
      data: { message: message, chatId: this.selectedChatId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.logMessageDialogClosed(message.id!, result);
    });
  }
  /**
   * Logs that a open message dialog action was triggered.
   * @param {string} messageId - The id of the message that will be edited
   */
  private logOpenMessageDialog(messageId: string) {
    console.log('Open message dialog called with ID: ', messageId);
  }
  /**
   * Logs that a message dialog was closed
   * @param {string} messageId - The id of the message that was edited
   * @param {any} result - The result of the dialog
   */
  private logMessageDialogClosed(messageId: string, result: any) {
    console.log('Message Dialog was closed with ID: ', messageId, result);
  }

  formatDate(date: any): string {
    if (!date) {
      return '';
    }
    let messageDate;
    if (date instanceof Timestamp) {
      messageDate = date.toDate();
    } else {
      messageDate = new Date(date);
    }
    const now = new Date();
    if (messageDate.toDateString() === now.toDateString()) {
      return new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(messageDate);
    } else {
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(messageDate);
    }
  }

  getFileNameFromUrl(url: string | undefined): string | null {
    if (url) {
      try {
        const urlObject = new URL(url);
        const pathname = urlObject.pathname;
        const parts = pathname.split('/');
        return parts.pop() || null;
      } catch (e) {
        return null;
      }
    } else {
      return null;
    }
  }
  formatBytes(bytes: number, decimals = 2): string {
    if (!bytes) {
      return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Adds a reaction to a message.
   * @param {Message} message - The message to react to.
   * @param {string} emoji - The emoji to use for the reaction.
   */
  addReaction(message: Message, emoji: string): void {
    this.logAddReaction(message.id!, emoji);
    if (!message.id || !this.currentUserId || !this.selectedChatId) {
      return;
    }
    this.messageService
      .updateMessage(
        this.selectedChatId,
        this.createReactionUpdate(message, emoji)
      )
      .then(() => {
        this.logAddReactionSuccess(message.id!, emoji);
      })
      .catch((error) => {
        this.logAddReactionError(message.id!, emoji, error);
      });
  }
  /**
   * Logs that a add reaction action was triggered.
   * @param {string} messageId - The id of the message that will be deleted
   * @param {string} emoji - The emoji that was used
   */
  private logAddReaction(messageId: string, emoji: string) {
    console.log(
      'Add reaction called with ID: ',
      messageId,
      'and emoji: ',
      emoji
    );
  }
  /**
   * Logs that a reaction was successfully added
   * @param {string} messageId - The id of the message that was deleted
   * @param {string} emoji - The emoji that was used
   */
  private logAddReactionSuccess(messageId: string, emoji: string) {
    console.log(
      'Reaction was successfully added with ID: ',
      messageId,
      'and emoji: ',
      emoji
    );
  }
  /**
   * Logs that a reaction was not successfully added
   * @param {string} messageId - The id of the message that was not deleted
   * @param {string} emoji - The emoji that was used
   * @param {any} error - the error that was thrown
   */
  private logAddReactionError(messageId: string, emoji: string, error: any) {
    console.log(
      'Error adding reaction with ID: ',
      messageId,
      'and emoji: ',
      emoji,
      error
    );
  }
  /**
   * Creates the reaction update object for firestore.
   * @param {Message} message - The message to react to.
   * @param {string} emoji - The emoji to use for the reaction.
   * @returns {Partial<Message>} The updated message object.
   */
  private createReactionUpdate(
    message: Message,
    emoji: string
  ): Partial<Message> {
    const updatedReactions = message.reactions ? { ...message.reactions } : {};
    // Remove existing reaction from the current user
    for (const key in updatedReactions) {
      if (updatedReactions[key].userIds.includes(this.currentUserId!)) {
        updatedReactions[key].userIds = updatedReactions[key].userIds.filter(
          (id) => id !== this.currentUserId
        );
        if (updatedReactions[key].userIds.length === 0) {
          delete updatedReactions[key];
        }
      }
    }
    // Add the new reaction
    if (updatedReactions[emoji]) {
      updatedReactions[emoji].userIds.push(this.currentUserId!);
    } else {
      updatedReactions[emoji] = { userIds: [this.currentUserId!] };
    }
    return { ...message, reactions: updatedReactions };
  }

  /**
   * Returns an array of reactions with emoji and count
   * @param { { [emoji: string]: { userIds: string[]; }; } | undefined} reactions - the reactions object
   * @returns {{ emoji: string; count: number; }[]} the array of reactions
   */
  getReactionsArray(
    reactions: { [emoji: string]: { userIds: string[] } } | undefined
  ): { emoji: string; count: number }[] {
    if (!reactions) {
      return [];
    }
    return Object.entries(reactions).map(([emoji, data]) => ({
      emoji,
      count: data.userIds.length,
    }));
  }
  /**
   * Opens the reaction dialog.
   * @param {Message} message - The message to show reactions for.
   */
  openReactionDialog(message: Message): void {
    this.logOpenReactionDialog(message.id!);
    this.dialog.open(ReactionDialogComponent, {
      width: '500px',
      data: { message: message },
    });
  }
  /**
   * Logs that a open reaction dialog action was triggered.
   * @param {string} messageId - The id of the message that will be edited
   */
  private logOpenReactionDialog(messageId: string) {
    console.log('Open reaction dialog called with ID: ', messageId);
  }
  /**
   * Returns the name of a user by its id
   * @param {string} userId - the id of the user
   * @returns {string} the name of the user
   */
  getUserName(userId: string): string {
    if (userId === 'user1') {
      return 'User 1';
    }
    if (userId === 'user2') {
      return 'User 2';
    }
    return userId;
  }
  /**
   * Opens a message context menu.
   * @param {MouseEvent} event - The mouse event.
   * @param {Message} message - The message for which to open the context menu.
   * @param {MatMenuTrigger} menuTrigger - The menu trigger.
   */
  openMessageContextMenu(
    event: MouseEvent,
    message: Message,
    menuTrigger: MatMenuTrigger
  ): void {
    event.preventDefault();
    menuTrigger.openMenu();
  }
  /**
   * Sets the reply to for a new message.
   * @param {Message} message - The message to reply to.
   */
  replyToMessage(message: Message): void {
    this.logReplyToMessage(message.id!);
    this.newMessage = '';
    this.editingMessage = null;
    this.selectedFile = null;
    this.fileUrl = null;
    this.fileName = null;
    this.newMessage = `> ${message.content.substring(0, 50)}...\n`;
    this.scrollToBottom();
  }
  /**
   * Logs that a reply to message action was triggered.
   * @param {string} messageId - The id of the message that will be replied to.
   */
  private logReplyToMessage(messageId: string) {
    console.log('Reply to message called with ID: ', messageId);
  }
}
