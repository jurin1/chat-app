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
import { MessageService } from '../message.service';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SharedModule } from '../../shared/shared';
import { Timestamp } from 'firebase/firestore';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Interface representing a message in the chat.
 */
interface Message {
  id?: string;
  content: string;
  senderId: string;
  timestamp: any;
  fileUrl?: string;
  fileName?: string;
  fileDeleted?: boolean;
  fileSize?: number;
}

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
   * Subscription to the auth user observable.
   */
  private authSubscription?: Subscription;

  /**
   * Constructor for ChatComponent.
   * @param {MessageService} messageService - Service for managing messages.
   * @param {AuthService} auth - Service for handling user authentication.
   * @param {DomSanitizer} sanitizer - Service for sanitizing URLs.
   */
  constructor(
    private messageService: MessageService,
    public auth: AuthService,
    private sanitizer: DomSanitizer
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
}
