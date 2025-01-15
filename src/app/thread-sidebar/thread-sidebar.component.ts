import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { MessageService, Message } from '../message.service';
import {
  Observable,
  Subscription,
  map,
  of,
  switchMap,
  tap,
  forkJoin,
} from 'rxjs';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../../shared/shared';
import { MatButtonModule } from '@angular/material/button';
import { Timestamp } from 'firebase/firestore';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ReactionDialogComponent } from '../reaction-dialog/reaction-dialog.component';
import { MessageDialogComponent } from '../message-dialog/message-dialog.component';
import { MatMenuModule } from '@angular/material/menu';

/**
 * Component for displaying a thread of messages in a sidebar.
 */
@Component({
  selector: 'app-thread-sidebar',
  standalone: true,
  imports: [
    SharedModule,
    NgStyle,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './thread-sidebar.component.html',
  styleUrls: ['./thread-sidebar.component.scss'],
})
export class ThreadSidebarComponent implements OnChanges, OnDestroy {
  /**
   * The ID of the selected message to display the thread for.
   */
  @Input() selectedMessageId: string | null = null;

  /**
   * Observable that emits an array of messages for the thread.
   */
  messages$: Observable<Message[]> = of([]);

  /**
   * The original Message
   */
  originalMessage$: Observable<Message | undefined> = of(undefined);

  /**
   * Subscription to the messages observable.
   */
  private messagesSubscription?: Subscription;

  /**
   * Subscription to the auth user observable.
   */
  private authSubscription?: Subscription;

  /**
   * Output event to close the thread.
   */
  @Output() closeThread = new EventEmitter<void>();

  /**
   * The ID of the current user.
   */
  currentUserId: string | undefined;

  /**
   * Array of predefined emojis for reactions.
   */
  readonly emojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  /**
   * Constructor for ThreadSidebarComponent.
   * @param {MessageService} messageService - Service for managing messages.
   * @param {AuthService} auth - Service for handling user authentication.
   * @param {MatDialog} dialog - Service for opening dialogs.
   */
  constructor(
    private messageService: MessageService,
    public auth: AuthService,
    public dialog: MatDialog
  ) {
    this.logComponentInitialization();
  }
  /**
   * Logs the initialization of the component.
   */
  private logComponentInitialization(): void {
    console.log('ThreadSidebarComponent initialized');
  }
  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   */
  ngOnInit(): void {
    this.subscribeToAuthUser();
  }
  /**
   * Lifecycle hook that is called when the component's inputs change.
   * @param {SimpleChanges} changes - Object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedMessageId'] && this.selectedMessageId) {
      this.loadThreadMessages(this.selectedMessageId);
    }
  }
  /**
   * Lifecycle hook that is called when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  /**
   * Loads the messages for the given thread.
   * @param {string} messageId - The ID of the message to load replies for.
   */
  private loadThreadMessages(messageId: string): void {
    this.logLoadThreadMessages(messageId);
    this.messagesSubscription = this.messageService
      .getChats()
      .pipe(
        tap((chats) => console.log('Chats loaded:', chats)),
        switchMap((chats) => {
          const chat = chats.find((chat) => {
            return chat.participants.includes(this.currentUserId!);
          });
          if (chat && chat.id) {
            console.log('Chat found:', chat);
            return this.messageService.getMessages(chat.id).pipe(
              tap((messages) => console.log('Messages loaded:', messages)),
              switchMap((messages) => {
                const originalMessage = messages.find(
                  (message) => message.id === messageId
                );
                console.log('Original message loaded:', originalMessage);
                const filteredMessages = messages.filter(
                  (message) => message.replyTo === messageId
                );
                console.log('Filtered messages:', filteredMessages);
                return forkJoin([of(originalMessage), of(filteredMessages)]);
              })
            );
          }
          console.log('No chat found for user:', this.currentUserId);
          return of([undefined, []]);
        })
      )
      .subscribe(([originalMessage, messages]) => {
        this.originalMessage$ = of(originalMessage as Message | undefined);
        this.messages$ = of(messages ?? []);
        console.log('Final messages for thread:', messages);
      });
  }
  /**
   * Logs that the load thread message was called
   * @param {string} messageId - The id of the message that is the parent
   */
  private logLoadThreadMessages(messageId: string) {
    console.log(
      'ThreadSidebarComponent loadThreadMessages called with messageId: ',
      messageId
    );
  }
  /**
   * Formats the date for display.
   * @param {any} date - The date to format.
   * @returns {string} The formatted date string.
   */
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
   * Closes the thread sidebar.
   */
  closeThreadSidebar(): void {
    this.closeThread.emit();
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
   * Adds a reaction to a message.
   * @param {Message} message - The message to react to.
   * @param {string} emoji - The emoji to use for the reaction.
   */
  addReaction(message: Message, emoji: string): void {
    this.logAddReaction(message.id!, emoji);
    if (!message.id || !this.currentUserId) {
      return;
    }
    this.messageService
      .updateMessage(
        this.selectedMessageId!,
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
   * Opens a message dialog to edit or delete a message.
   * @param {Message} message - The message to edit.
   */
  openMessageDialog(message: Message): void {
    if (message.senderId !== this.currentUserId) {
      console.log('You are not allowed to edit this message');
      return;
    }
    this.logOpenMessageDialog(message.id!);
    this.dialog.open(MessageDialogComponent, {
      width: '500px',
      data: { message: message, chatId: this.selectedMessageId! },
    });
  }
  /**
   * Logs that a open message dialog action was triggered.
   * @param {string} messageId - The id of the message that will be edited
   */
  private logOpenMessageDialog(messageId: string) {
    console.log('Open message dialog called with ID: ', messageId);
  }
}
