import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, switchMap, first, from, of, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '@firebase/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { catchError } from 'rxjs/operators';

/**
 * Interface representing a message in the chat.
 */
/**
 * Interface representing a message in the chat.
 */
/**
 * Interface representing a message in the chat.
 */
export interface Message {
    content: string;
    senderId: string;
    timestamp: any;
    fileUrl?: string;
    fileDeleted?: boolean;
    id?: string;
    fileName?: string;
    fileSize?: number;
    deleted?: boolean;
    reactions?: {
        [emoji: string]: {
            userIds: string[];
        };
    };
    replyTo?: string;
    replies?: number;
}

interface Chat {
  id?: string;
  type: 'single' | 'group';
  participants: string[];
  name?: string;
  isPublic?: boolean;
  lastMessageTimestamp?: any;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(
    private firestore: AngularFirestore,
    private auth: AuthService,
    private storage: AngularFireStorage
  ) {}

  /**
   * Retrieves all chats from Firestore, ordered by the last message timestamp.
   * @returns {Observable<Chat[]>} An observable of chat arrays.
   */
  getChats(): Observable<Chat[]> {
    return this.firestore
      .collection<Chat>('chats', (ref) =>
        ref.orderBy('lastMessageTimestamp', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  /**
   * Retrieves messages for a specific chat from Firestore, ordered by timestamp.
   * Checks for file existence in Firebase Storage and updates the message if necessary.
   * @param {string} chatId - The ID of the chat.
   * @returns {Observable<Message[]>} An observable of message arrays.
   */
  getMessages(chatId: string): Observable<Message[]> {
    return this.firestore
      .collection<Message>(`chats/${chatId}/messages`, (ref) =>
        ref.orderBy('timestamp')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        switchMap((messages) => {
          if (!messages || messages.length === 0) {
            return of([]); // Return empty array if no messages
          }
          return forkJoin(
            messages.map((message) => this.checkFileExistence(message, chatId))
          ).pipe(
            switchMap((updatedMessages) => {
              return of(updatedMessages);
            })
          );
        })
      );
  }

  /**
   * Checks if a file exists in Firebase Storage and updates the message accordingly.
   * @param {Message} message - The message object.
   * @param {string} chatId - The ID of the chat.
   * @returns {Observable<Message>} An observable of the updated message.
   */
  private checkFileExistence(
    message: Message,
    chatId: string
  ): Observable<Message> {
    if (!message.fileUrl || message.fileDeleted) {
      return of(message); // If no file URL or already marked as deleted, no action needed
    }
    return from(this.storage.refFromURL(message.fileUrl).getMetadata()).pipe(
      switchMap(() => {
        return of(message); // File exists, return message
      }),
      catchError(() => {
        // File does not exist, update message
        console.log('File not found for message: ', message.id);
        return this.updateMessageFileDeleted(message, chatId);
      })
    );
  }

  /**
   * Updates the fileDeleted flag of a message in Firestore.
   * @param {Message} message - The message to update.
   * @param {string} chatId - The ID of the chat.
   * @returns {Observable<Message>} An observable of the updated message.
   */
  private updateMessageFileDeleted(
    message: Message,
    chatId: string
  ): Observable<Message> {
    const updatedMessage = { ...message, fileDeleted: true };
    this.firestore
      .doc(`chats/${chatId}/messages/${message.id}`)
      .update(updatedMessage);
    return of(updatedMessage);
  }

  /**
   * Updates a message in Firestore.
   * @param {string} chatId - The ID of the chat.
   * @param {Partial<Message>} message - The message to update.
   * @returns {Promise<void>} A Promise that resolves when the message is updated.
   */
  updateMessage(chatId: string, message: Partial<Message>): Promise<void> {
    console.log(
      'updateMessage() called with chatId:',
      chatId,
      'and message:',
      message
    );
    return this.firestore
      .doc(`chats/${chatId}/messages/${message.id}`)
      .update(message)
      .then(() => {
        console.log('Message updated successfully');
      })
      .catch((error) => {
        console.error('Error updating message: ', error);
        return Promise.reject(error);
      });
  }
  /**
   * Creates a new chat in Firestore. Handles both single and group chats.
   * @param { 'single' | 'group' } type - The type of chat ('single' or 'group').
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Promise<any>} A Promise that resolves with the result of the chat creation.
   */
  createChat(
    type: 'single' | 'group',
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Promise<any> {
    return type === 'single'
      ? this.createSingleChat(participants, name, isPublic)
      : this.createGroupChat(type, participants, name, isPublic);
  }
  /**
   * Creates a single chat
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Promise<any>} A Promise that resolves with the result of the chat creation.
   */
  private createSingleChat(
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Promise<any> {
    return this.firestore
      .collection<Chat>('chats', (ref) =>
        ref
          .where('type', '==', 'single')
          .where('participants', '==', participants.sort())
      )
      .get()
      .pipe(
        switchMap((querySnapshot) =>
          this.handleSingleChatQuery(
            querySnapshot,
            participants,
            name,
            isPublic
          )
        )
      )
      .toPromise();
  }

  /**
   * Handles the query snapshot for creating a single chat.
   * @param querySnapshot - The result of the Firestore query.
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Observable<any>} An observable that resolves with the chat ID or creates a new chat.
   */
  private handleSingleChatQuery(
    querySnapshot: any,
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Observable<any> {
    if (!querySnapshot.empty) {
      console.log('Chat already exists:', querySnapshot.docs[0].id);
      return of(Promise.resolve(querySnapshot.docs[0].id));
    } else {
      return from(this.addNewChat('single', participants, name, isPublic));
    }
  }

  /**
   * Creates a group chat
   * @param { 'single' | 'group' } type - The type of chat ('single' or 'group').
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Promise<any>} A Promise that resolves with the result of the chat creation.
   */
  private createGroupChat(
    type: 'single' | 'group',
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Promise<any> {
    return this.addNewChat(type, participants, name, isPublic);
  }
  /**
   * Adds a new chat document to Firestore.
   * @param { 'single' | 'group' } type - The type of chat ('single' or 'group').
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Promise<any>} A Promise that resolves with the result of adding the chat to the database.
   */
  private addNewChat(
    type: 'single' | 'group',
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Promise<any> {
    const chatData = this.createChatData(type, participants, name, isPublic);
    return this.firestore.collection<Chat>('chats').add(chatData);
  }
  /**
   * Creates the chat data object.
   * @param { 'single' | 'group' } type - The type of chat ('single' or 'group').
   * @param {string[]} participants - An array of user IDs participating in the chat.
   * @param {string} [name] - Optional name for the chat.
   * @param {boolean} [isPublic] - Optional flag indicating if the chat is public.
   * @returns {Chat} The chat data object.
   */
  private createChatData(
    type: 'single' | 'group',
    participants: string[],
    name?: string,
    isPublic?: boolean
  ): Chat {
    return {
      type,
      participants,
      ...(name && { name }),
      ...(isPublic !== undefined && { isPublic }),
      lastMessageTimestamp: new Date(),
    };
  }

  /**
   * Sends a message to a specific chat. Handles both text messages and file uploads.
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File | null} file - Optional file to upload and include in the message.
   * @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  sendMessage(
    chatId: string,
    content: string,
    file: File | null,
    replyTo?: string
  ): Promise<any> {
    console.log(
      'sendMessage() called with content:',
      content,
      'and chatId:',
      chatId,
      'and file:',
      file
    );
    return this.auth.user
      .pipe(
        first(),
        switchMap((user) =>
          this.handleSendMessage(user, chatId, content, file, replyTo)
        )
      )
      .toPromise();
  }
  /**
   * Handles sending the message after getting the user
   * @param {User | null} user - The current user
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File | null} file - Optional file to upload and include in the message.
   *  @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private handleSendMessage(
    user: User | null,
    chatId: string,
    content: string,
    file: File | null,
    replyTo?: string
  ): Promise<any> {
    if (!user) {
      return Promise.reject('No user found');
    }
    const firebaseUser = user as User;
    const timestamp = new Date();
    return this.handleMessageData(
      chatId,
      content,
      file,
      firebaseUser,
      timestamp,
      replyTo
    );
  }
  /**
   * Handles sending a message with or without a file
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File | null} file - Optional file to upload and include in the message.
   * @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   * @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private handleMessageData(
    chatId: string,
    content: string,
    file: File | null,
    firebaseUser: User,
    timestamp: Date,
    replyTo?: string
  ): Promise<any> {
    return file
      ? this.uploadFileAndSendMessage(
          chatId,
          content,
          file,
          firebaseUser,
          timestamp,
          replyTo
        )
      : this.sendTextMessage(chatId, content, firebaseUser, timestamp, replyTo);
  }

  /**
   * Uploads a file to Firebase Storage and then sends the message
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File} file -  file to upload and include in the message.
   * @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   * @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private uploadFileAndSendMessage(
    chatId: string,
    content: string,
    file: File,
    firebaseUser: User,
    timestamp: Date,
    replyTo?: string
  ): Promise<any> {
    const filePath = this.createFilePath(firebaseUser, file);
    return from(this.storage.upload(filePath, file))
      .pipe(
        switchMap((task) => from(task.ref.getDownloadURL())),
        switchMap((fileUrl) => {
          return this.addMessageToFirestore(
            chatId,
            content,
            firebaseUser,
            timestamp,
            fileUrl,
            file,
            replyTo
          );
        })
      )
      .toPromise();
  }

  /**
   * Creates the file path for firebase storage.
   * @param {User} firebaseUser - The firebase user object.
   * @param {File} file - The file object.
   * @returns {string} The file path.
   */
  private createFilePath(firebaseUser: User, file: File): string {
    return `chat-files/${firebaseUser.uid}/${new Date().getTime()}_${
      file.name
    }`;
  }
  /**
   * Sends a text message to firestore
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   * @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private sendTextMessage(
    chatId: string,
    content: string,
    firebaseUser: User,
    timestamp: Date,
    replyTo?: string
  ): Promise<any> {
    return this.addMessageToFirestore(
      chatId,
      content,
      firebaseUser,
      timestamp,
      undefined,
      undefined,
      replyTo
    );
  }
  /**
   * Adds a message to a Firestore chat collection
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   *  @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   *  @param {string} [fileUrl] - Optional fileUrl
   * @param {File} [file] - Optional file
   * @param {string} [replyTo] - Optional replyTo id.
   * @returns {Promise<any>} A Promise that resolves with the result of adding the message to firestore.
   */
  private addMessageToFirestore(
    chatId: string,
    content: string,
    firebaseUser: User,
    timestamp: Date,
    fileUrl?: string,
    file?: File,
    replyTo?: string
  ): Promise<any> {
    const messageData = this.createMessageData(
      content,
      firebaseUser,
      timestamp,
      fileUrl,
      file,
      replyTo
    );
    console.log('Message Data:', messageData);
    return this.firestore
      .collection<Message>(`chats/${chatId}/messages`)
      .add(messageData)
      .then((docRef) => {
        console.log('Document written with ID: ', docRef.id);
        this.updateLastMessageTimestamp(chatId, timestamp);
        if (replyTo) {
          this.updateReplyCount(chatId, replyTo);
        }
        return docRef;
      })
      .catch((error) => {
        console.error('Error adding document: ', error);
        return Promise.reject(error);
      });
  }
  /**
   * Creates the message data object.
   * @param {string} content - The content of the message.
   *  @param {User} firebaseUser - The firebase user object.
   * @param {Date} timestamp - the timestamp.
   * @param {string} [fileUrl] - Optional fileUrl.
   * @param {File} [file] - Optional file.
   *  @param {string} [replyTo] - Optional replyTo id.
   * @returns {Message} The message data object.
   */
  private createMessageData(
    content: string,
    firebaseUser: User,
    timestamp: Date,
    fileUrl?: string,
    file?: File,
    replyTo?: string
  ): Message {
    return {
      content: content.replace(/\n/g, '<br>'),
      senderId: firebaseUser.uid,
      timestamp: timestamp,
      fileDeleted: false,
      deleted: false, // Neu hinzugefügt
      ...(fileUrl && { fileUrl }),
      ...(file && { fileName: file.name }),
      ...(file && { fileSize: file.size }),
      ...(replyTo && { replyTo }),
    };
  }
  /**
   * Updates the last message timestamp of the chat document in firestore
   * @param {string} chatId - The ID of the chat to update.
   * @param {Date} timestamp - the timestamp
   * @returns {void}
   */
  private updateLastMessageTimestamp(chatId: string, timestamp: Date): void {
    this.firestore
      .doc(`chats/${chatId}`)
      .get()
      .toPromise()
      .then((doc) => {
        if (doc && doc.exists) {
          this.firestore
            .doc(`chats/${chatId}`)
            .update({ lastMessageTimestamp: timestamp });
        } else {
          console.error(`Chat document with ID ${chatId} does not exist.`);
        }
      })
      .catch((error) => {
        console.error(
          `Error checking if chat document exists with ID: ${chatId}`,
          error
        );
      });
  }

  /**
   * Updates the reply count of a message in Firestore.
   * @param {string} chatId - The ID of the chat.
   * @param {string} messageId - The ID of the message to update.
   * @returns {Promise<void>} A Promise that resolves when the message is updated.
   */
  private updateReplyCount(chatId: string, messageId: string): Promise<void> {
    return this.firestore
      .doc(`chats/${chatId}/messages/${messageId}`)
      .get()
      .toPromise()
      .then((doc) => {
        if (doc && doc.exists) {
          const message = doc.data() as Message;
          const newReplyCount = (message.replies || 0) + 1;
          return this.firestore
            .doc(`chats/${chatId}/messages/${messageId}`)
            .update({ replies: newReplyCount });
        } else {
          console.error(
            `Message document with ID ${messageId} does not exist.`
          );
          return Promise.reject(
            `Message document with ID ${messageId} does not exist.`
          );
        }
      })
      .catch((error) => {
        console.error(
          `Error checking if message document exists with ID: ${messageId}`,
          error
        );
        return Promise.reject(error);
      });
  }
}
