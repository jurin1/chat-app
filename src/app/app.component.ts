import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared';
import { ChatComponent } from './chat/chat.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AuthService } from './auth.service';

/**
 * The root component of the chat application.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SidebarComponent, SharedModule, ChatComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  /**
   * Title of the application.
   */
  title = 'chat-app';

  /**
   * Currently selected chat ID.
   */
  selectedChatId: string = 'test-chat';

  /**
   * Constructor for AppComponent.
   * @param {AuthService} auth - AuthService for handling user authentication.
   */
  constructor(public auth: AuthService) {
    this.logComponentInitialization();
  }

  /**
   * Logs the initialization of the component.
   */
  private logComponentInitialization(): void {
    console.log('AppComponent initialized');
  }

  /**
   * Handles the selection of a chat.
   * @param {string} chatId - The ID of the selected chat.
   */
  onChatSelected(chatId: string): void {
    this.updateSelectedChatId(chatId);
    this.logSelectedChatId(chatId);
  }

  /**
   * Updates the selected chat ID.
   * @param {string} chatId - The ID of the selected chat.
   */
  private updateSelectedChatId(chatId: string): void {
    this.selectedChatId = chatId;
  }

  /**
   * Logs the selected chat ID.
   * @param {string} chatId - The ID of the selected chat.
   */
  private logSelectedChatId(chatId: string): void {
    console.log('Chat selected with ID: ', chatId);
  }

  /**
   * Switches the current user using the AuthService.
   */
  switchUser(): void {
    this.auth.switchUser();
  }
}