import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../shared/shared';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from '../message.service';
import { AuthService } from '../auth.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Message } from '../message.service'; // Import from message.service.ts

@Component({
  selector: 'app-message-dialog',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss'],
})
export class MessageDialogComponent {
  editedMessageContent: string;
  selectedFile: File | null = null;
  fileUrl: SafeUrl | null = null;
  fileName: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: Message; chatId: string },
    private messageService: MessageService,
    public auth: AuthService,
    private sanitizer: DomSanitizer
  ) {
    this.editedMessageContent = data.message.content;
    this.fileName = data.message.fileName || null;
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
   * Updates a message in Firestore and closes the dialog
   */
  updateMessage(): void {
    this.messageService
      .updateMessage(this.data.chatId, {
        ...this.data.message,
        content: this.editedMessageContent,
        deleted: false,
      })
      .then(() => {
        this.dialogRef.close();
        this.logUpdateMessageSuccess(this.data.message.id!);
      })
      .catch((error) => {
        this.logUpdateMessageError(this.data.message.id!, error);
      });
  }
  /**
   *  Deletes a file from a message by setting the fileDeleted flag to true.
   */
  deleteFile(): void {
    this.messageService
      .updateMessage(this.data.chatId, {
        ...this.data.message,
        fileDeleted: true,
      })
      .then(() => {
        this.dialogRef.close();
        this.logFileDeletionSuccess(this.data.message.id!);
      })
      .catch((error) => {
        this.logFileDeletionError(this.data.message.id!, error);
      });
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
   * Closes the dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }
  /**
   * Sends a new message.
   */
  sendMessage(): void {
    if (this.selectedFile) {
      this.messageService
        .sendMessage(
          this.data.chatId,
          this.editedMessageContent,
          this.selectedFile
        )
        .then(() => {
          this.dialogRef.close();
        });
    } else {
      this.updateMessage();
    }
  }
}
