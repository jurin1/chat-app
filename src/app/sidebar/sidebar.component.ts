import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { MessageService } from '../message.service';
import { Observable, switchMap, from, of, tap, Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateChatDialogComponent } from '../create-chat-dialog/create-chat-dialog.component';
import { Timestamp } from 'firebase/firestore';
import { UserService } from '../user.service';
import { SharedModule } from '../../shared/shared';

interface Chat {
  id?: string;
  type: 'single' | 'group';
  participants: string[];
  name?: string;
  isPublic?: boolean;
  lastMessageTimestamp?: any;
}

/**
 * Component for displaying the sidebar with chat list.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  /**
   * Observable that emits an array of chats.
   */
  chats$!: Observable<Chat[]>;

  /**
   * The ID of the current user.
   */
  currentUserId: string | undefined;

  /**
   * Output event emitter for when a chat is selected.
   */
  @Output() chatSelected = new EventEmitter<string>();

  /**
   * Subscription to the auth user observable.
   */
  private authSubscription?: Subscription;

  /**
   * Constructor for SidebarComponent.
   * @param {MessageService} messageService - Service for managing messages and chats.
   * @param {AuthService} auth - Service for handling user authentication.
   * @param {MatDialog} dialog - Service for opening dialogs.
   * @param {UserService} userService - Service for managing user data.
   */
  constructor(
    private messageService: MessageService,
    public auth: AuthService,
    public dialog: MatDialog,
    private userService: UserService
  ) {
    this.logComponentInitialization();
  }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   */
  ngOnInit(): void {
    this.setupChats();
    this.subscribeToAuthUser();
    this.logNgOnInit();
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
    console.log('SidebarComponent initialized');
  }

  /**
   * Logs the ngOnInit lifecycle hook.
   */
  private logNgOnInit(): void {
    console.log('SidebarComponent ngOnInit called');
  }

  /**
   * Sets up the observable for fetching and processing chats.
   */
  private setupChats(): void {
    this.chats$ = this.messageService.getChats().pipe(
      tap((chats) => this.logChats(chats)),
      switchMap((chats) => this.processChats(chats)),
      tap((finalChats) => this.logFinalChats(finalChats)),
      tap((finalChats) => this.logChatDetails(finalChats))
    );
  }

  /**
   * Logs the fetched chats.
   * @param {Chat[]} chats - Array of fetched chats.
   */
  private logChats(chats: Chat[]): void {
    console.log('Chats:', chats);
  }

  /**
   * Processes the fetched chats, fetching user data for single chats.
   * @param {Chat[]} chats - Array of fetched chats.
   * @returns {Observable<Chat[]>} Observable that emits the processed array of chats.
   */
  private processChats(chats: Chat[]): Observable<Chat[]> {
    return this.auth.user.pipe(
      tap((user) => this.logUser(user)),
      switchMap((user) => this.handleUser(user, chats))
    );
  }

  /**
   * Logs the current user.
   * @param {User | null} user - The current user object, or null if no user is logged in.
   */
  private logUser(user: any | null): void {
    console.log('User:', user);
  }

  /**
   * Handles the logic when a user is available.
   * @param {User | null} user - The current user object, or null if no user is logged in.
   * @param {Chat[]} chats - Array of fetched chats.
   * @returns {Observable<Chat[]>} Observable that emits the processed array of chats.
   */
  private handleUser(user: any | null, chats: Chat[]): Observable<Chat[]> {
    if (user) {
      this.currentUserId = user.uid;
      return from(this.processChatData(chats));
    } else {
      return of(chats);
    }
  }

  /**
   * Processes the chat data to format timestamps and fetch user names for single chats.
   * @param {Chat[]} chats - Array of fetched chats.
   * @returns {Promise<Chat[]>} Promise that resolves with the processed array of chats.
   */
  private async processChatData(chats: Chat[]): Promise<Chat[]> {
    return Promise.all(
      chats.map(async (chat: Chat) => {
        chat = this.formatTimestamp(chat);
        if (chat.type === 'single' && !chat.name) {
          chat = await this.fetchSingleChatName(chat);
        }
        return chat;
      })
    );
  }

  /**
   * Formats the lastMessageTimestamp of a chat if it's a Timestamp object.
   * @param {Chat} chat - The chat object to format.
   * @returns {Chat} The chat object with the formatted timestamp.
   */
  private formatTimestamp(chat: Chat): Chat {
    if (chat.lastMessageTimestamp instanceof Timestamp) {
      chat.lastMessageTimestamp = chat.lastMessageTimestamp.toDate();
    }
    return chat;
  }

  /**
   * Fetches the display name for single chats.
   * @param {Chat} chat - The chat object.
   * @returns {Promise<Chat>} Promise that resolves with the chat object including the name.
   */
  private async fetchSingleChatName(chat: Chat): Promise<Chat> {
    const otherUserId = chat.participants.find(
      (uid) => uid !== this.currentUserId
    );
    if (otherUserId) {
      const otherUser = await this.userService.getUser(otherUserId).toPromise();
      chat.name = otherUser?.displayName;
    }
    return chat;
  }

  /**
   * Logs the final processed chats.
   * @param {Chat[]} finalChats - Array of processed chats.
   */
  private logFinalChats(finalChats: Chat[]): void {
    console.log('Final Chats', finalChats);
  }

  /**
   * Logs details for each chat.
   * @param {Chat[]} finalChats - Array of processed chats.
   */
  private logChatDetails(finalChats: Chat[]): void {
    if (finalChats && finalChats.length > 0) {
      finalChats.forEach((chat) => {
        console.log('Chat ID:', chat.id);
        console.log('Chat Name:', chat.name);
        console.log('Chat lastMessageTimestamp:', chat.lastMessageTimestamp);
      });
    } else {
      console.log('No chats found');
    }
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
   * Emits the selected chat ID.
   * @param {string} chatId - The ID of the selected chat.
   */
  selectChat(chatId: string): void {
    this.logSelectChat(chatId);
    this.chatSelected.emit(chatId);
  }

  /**
   * Logs the selected chat ID.
   * @param {string} chatId - The ID of the selected chat.
   */
  private logSelectChat(chatId: string): void {
    console.log('SidebarComponent selectChat called with chatId: ', chatId);
  }

  /**
   * Opens the create chat dialog.
   */
  openCreateChatDialog(): void {
    const dialogRef = this.dialog.open(CreateChatDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      this.handleDialogResult(result);
    });
  }

  /**
   * Handles the result after the create chat dialog is closed.
   * @param {any} result - The result from the dialog.
   */
  private handleDialogResult(result: any): void {
    if (result) {
      this.logDialogResult(result);
      if (result.type === 'single' && result.selectedUsers.length === 1) {
        this.createSingleChat(result.selectedUsers[0]);
      } else if (
        result.type === 'group' &&
        result.selectedUsers.length > 1 &&
        result.chatName
      ) {
        this.createGroupChat(result);
      }
    }
  }

  /**
   * Logs the dialog result.
   * @param {any} result - The result from the dialog.
   */
  private logDialogResult(result: any): void {
    console.log('Dialog closed with result:', result);
  }

  /**
   * Creates a single chat.
   * @param {string} otherUserId - The ID of the other user.
   */
  private createSingleChat(otherUserId: string): void {
    this.userService.getUser(otherUserId).subscribe((user) => {
      if (user) {
        this.messageService
          .createChat(
            'single',
            [this.currentUserId!, otherUserId],
            user.displayName
          )
          .then((docRef) => {
            this.handleChatCreation(docRef);
          })
          .catch((error) => {
            console.error('Error creating chat: ', error);
          });
      }
    });
  }

  /**
   * Creates a group chat.
   * @param {any} result - The dialog result containing group chat information.
   */
  private createGroupChat(result: any): void {
    this.messageService
      .createChat(
        'group',
        [this.currentUserId!, ...result.selectedUsers],
        result.chatName
      )
      .then((docRef) => {
        this.handleChatCreation(docRef);
      })
      .catch((error) => {
        console.error('Error creating chat: ', error);
      });
  }

  /**
   * Handles the chat creation result.
   * @param {any} docRef - The document reference or ID of the created chat.
   */
  private handleChatCreation(docRef: any): void {
    console.log('Chat created with ID: ', docRef);
    if (typeof docRef === 'string') {
      this.selectChat(docRef);
    } else {
      this.selectChat(docRef.id);
    }
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
    const now = new Date();
    const messageDate = new Date(date);
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
      }).format(messageDate);
    }
  }
}
