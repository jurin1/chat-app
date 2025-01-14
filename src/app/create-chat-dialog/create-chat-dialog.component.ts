import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../user.service';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Interface representing a user with a unique ID and display name.
 */
interface User {
  uid: string;
  displayName: string;
}

/**
 * Component for creating new chats (single or group).
 */
@Component({
  selector: 'app-create-chat-dialog',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    MatRadioModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './create-chat-dialog.component.html',
  styleUrls: ['./create-chat-dialog.component.scss'],
})
export class CreateChatDialogComponent implements OnInit, OnDestroy {
  /**
   * Observable that emits an array of users.
   */
  users$!: Observable<User[]>;

  /**
   * Type of the new chat ('single' or 'group').
   */
  newChatType: 'single' | 'group' = 'single';

  /**
   * Array of selected user IDs for the new chat.
   */
  selectedUsers: string[] = [];

  /**
   * ID of the current user.
   */
  currentUserId: string | undefined;

  /**
   * Name of the chat (for group chats).
   */
  chatName: string = '';

  /**
   * Subscription to the auth user observable.
   */
  private authSubscription?: Subscription;

  /**
   * Constructor for CreateChatDialogComponent.
   * @param {MatDialogRef<CreateChatDialogComponent>} dialogRef - Reference to the dialog.
   * @param {UserService} userService - Service for managing user data.
   * @param {AuthService} auth - Service for handling user authentication.
   */
  constructor(
    public dialogRef: MatDialogRef<CreateChatDialogComponent>,
    private userService: UserService,
    public auth: AuthService
  ) {}

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   */
  ngOnInit(): void {
    this.setupUsers();
    this.subscribeToAuthUser();
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  /**
   * Sets up the observable for fetching users.
   */
  private setupUsers(): void {
    this.users$ = this.userService.getUsers();
  }

  /**
   * Subscribes to the auth user observable to get the current user ID.
   */
  private subscribeToAuthUser(): void {
    this.authSubscription = this.auth.user.subscribe((user) => {
      this.currentUserId = user?.uid;
    });
  }

  /**
   * Toggles the selection of a user for the new chat.
   * @param {string} userId - The ID of the user to toggle.
   */
  toggleUser(userId: string): void {
    if (this.newChatType === 'single') {
      this.selectSingleUser(userId);
    } else {
      this.toggleMultipleUsers(userId);
    }
  }

  /**
   * Selects a single user for a single chat.
   * @param {string} userId - The ID of the user to select.
   */
  private selectSingleUser(userId: string): void {
    this.selectedUsers = [userId];
  }

  /**
   * Toggles the selection of a user for a group chat.
   * @param {string} userId - The ID of the user to toggle.
   */
  private toggleMultipleUsers(userId: string): void {
    if (this.selectedUsers.includes(userId)) {
      this.removeUserFromSelection(userId);
    } else {
      this.addUserToSelection(userId);
    }
  }

  /**
   * Removes a user from the selected users array.
   * @param {string} userId - The ID of the user to remove.
   */
  private removeUserFromSelection(userId: string): void {
    this.selectedUsers = this.selectedUsers.filter((uid) => uid !== userId);
  }

  /**
   * Adds a user to the selected users array.
   * @param {string} userId - The ID of the user to add.
   */
  private addUserToSelection(userId: string): void {
    this.selectedUsers.push(userId);
  }

  /**
   * Closes the dialog and returns the chat creation data.
   */
  createChat(): void {
    this.dialogRef.close(this.getChatCreationData());
  }

  /**
   * Returns the data for chat creation.
   * @returns {{ type: 'single' | 'group', selectedUsers: string[], chatName: string }} Object containing the chat type, selected user IDs, and chat name.
   */
  private getChatCreationData(): {
    type: 'single' | 'group';
    selectedUsers: string[];
    chatName: string;
  } {
    return {
      type: this.newChatType,
      selectedUsers: this.selectedUsers,
      chatName: this.chatName,
    };
  }
}
