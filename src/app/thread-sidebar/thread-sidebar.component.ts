import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { MessageService, Message } from '../message.service';
import { Observable, Subscription, map, of, switchMap } from 'rxjs';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../../shared/shared';
import { MatButtonModule } from '@angular/material/button';
import { Timestamp } from 'firebase/firestore';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  ],
  templateUrl: './thread-sidebar.component.html',
  styleUrls: ['./thread-sidebar.component.scss'],
})
export class ThreadSidebarComponent implements OnChanges, OnDestroy {
  /**
   * The ID of the chat.
   */
  @Input() chatId: string | null = null;

  /**
   * The ID of the message to display the thread for.
   */
  @Input() messageId: string | null = null;

  /**
   * Observable that emits an array of messages in the thread.
   */
  threadMessages$!: Observable<Message[]>;

  /**
   * Subscription to the message observable.
   */
  private messageSubscription?: Subscription;

  /**
   * Constructor for ThreadSidebarComponent.
   * @param {MessageService} messageService - Service for managing messages.
   */
  constructor(private messageService: MessageService) {
    this.logComponentInitialization();
  }

  /**
   * Lifecycle hook that is called when the component's inputs change.
   * @param {SimpleChanges} changes - Object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messageId'] || changes['chatId']) {
      this.loadThreadMessages();
    }
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.messageSubscription?.unsubscribe();
  }

  /**
   * Logs the initialization of the component.
   */
  private logComponentInitialization(): void {
    console.log('ThreadSidebarComponent initialized');
  }

  /**
   * Loads the messages for the thread.
   */
  private loadThreadMessages(): void {
    if (this.chatId && this.messageId) {
      this.logLoadThreadMessages(this.chatId, this.messageId);
      this.threadMessages$ = this.messageService
        .getMessages(this.chatId)
        .pipe(
          map((messages) =>
            messages.filter(
              (message) =>
                message.id === this.messageId ||
                message.replyTo === this.messageId
            )
          )
        );
    } else {
      this.threadMessages$ = of([]);
    }
  }

  /**
   * Logs when the loadThreadMessages method is called.
   * @param {string} chatId - The ID of the chat.
   * @param {string} messageId - The ID of the message.
   */
  private logLoadThreadMessages(chatId: string, messageId: string): void {
    console.log(
      'ThreadSidebarComponent loadThreadMessages called with chatId:',
      chatId,
      'and messageId:',
      messageId
    );
  }

  /**
   * Formats a date for display.
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
}
