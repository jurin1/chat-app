import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SharedModule } from '../../shared/shared';
import { Message } from '../message.service';
import { MatListModule } from '@angular/material/list';

/**
 * Component for displaying reactions in a dialog.
 */
@Component({
  selector: 'app-reaction-dialog',
  standalone: true,
  imports: [SharedModule, MatListModule],
  templateUrl: './reaction-dialog.component.html',
  styleUrls: ['./reaction-dialog.component.scss'],
})
export class ReactionDialogComponent {
  /**
   * Constructor for ReactionDialogComponent.
   * @param {any} data - Data for the dialog
   */
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: Message }) {
    console.log('ReactionDialogComponent initialized', data);
  }
  /**
   * Returns an array of reactions with emoji and count
   * @param { { [emoji: string]: { userIds: string[]; }; } | undefined} reactions - the reactions object
   * @returns {{ emoji: string; userIds: string[]; }[]} the array of reactions
   */
  getReactionsArray(
    reactions: { [emoji: string]: { userIds: string[] } } | undefined
  ): { emoji: string; userIds: string[] }[] {
    if (!reactions) {
      return [];
    }
    return Object.entries(reactions).map(([emoji, data]) => ({
      emoji,
      userIds: data.userIds,
    }));
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
}
