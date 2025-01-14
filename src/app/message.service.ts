import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, switchMap, first, from, of } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '@firebase/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';

interface Message {
  content: string;
  senderId: string;
  timestamp: any;
  fileUrl?: string;
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
   * @param {string} chatId - The ID of the chat.
   * @returns {Observable<Message[]>} An observable of message arrays.
   */
  getMessages(chatId: string): Observable<Message[]> {
    return this.firestore
      .collection<Message>(`chats/${chatId}/messages`, (ref) =>
        ref.orderBy('timestamp')
      )
      .valueChanges({ idField: 'id' });
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
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  sendMessage(
    chatId: string,
    content: string,
    file: File | null
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
        switchMap((user) => this.handleSendMessage(user, chatId, content, file))
      )
      .toPromise();
  }
  /**
   * Handles sending the message after getting the user
   * @param {User | null} user - The current user
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File | null} file - Optional file to upload and include in the message.
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private handleSendMessage(
    user: User | null,
    chatId: string,
    content: string,
    file: File | null
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
      timestamp
    );
  }
  /**
   * Handles sending a message with or without a file
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File | null} file - Optional file to upload and include in the message.
   * @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private handleMessageData(
    chatId: string,
    content: string,
    file: File | null,
    firebaseUser: User,
    timestamp: Date
  ): Promise<any> {
    return file
      ? this.uploadFileAndSendMessage(
          chatId,
          content,
          file,
          firebaseUser,
          timestamp
        )
      : this.sendTextMessage(chatId, content, firebaseUser, timestamp);
  }

  /**
   * Uploads a file to Firebase Storage and then sends the message
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   * @param {File} file -  file to upload and include in the message.
   * @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private uploadFileAndSendMessage(
    chatId: string,
    content: string,
    file: File,
    firebaseUser: User,
    timestamp: Date
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
            fileUrl
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
   * @returns {Promise<any>} A Promise that resolves with the result of sending the message.
   */
  private sendTextMessage(
    chatId: string,
    content: string,
    firebaseUser: User,
    timestamp: Date
  ): Promise<any> {
    return this.addMessageToFirestore(chatId, content, firebaseUser, timestamp);
  }
  /**
   * Adds a message to a Firestore chat collection
   * @param {string} chatId - The ID of the chat to send the message to.
   * @param {string} content - The content of the message.
   *  @param {User} firebaseUser - The firebase user object
   * @param {Date} timestamp - the timestamp
   *  @param {string} [fileUrl] - Optional fileUrl
   * @returns {Promise<any>} A Promise that resolves with the result of adding the message to firestore.
   */
  private addMessageToFirestore(
    chatId: string,
    content: string,
    firebaseUser: User,
    timestamp: Date,
    fileUrl?: string
  ): Promise<any> {
    const messageData = this.createMessageData(
      content,
      firebaseUser,
      timestamp,
      fileUrl
    );
    console.log('Message Data:', messageData);
    return this.firestore
      .collection<Message>(`chats/${chatId}/messages`)
      .add(messageData)
      .then((docRef) => {
        console.log('Document written with ID: ', docRef.id);
        this.updateLastMessageTimestamp(chatId, timestamp);
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
   * @returns {Message} The message data object.
   */
  private createMessageData(
    content: string,
    firebaseUser: User,
    timestamp: Date,
    fileUrl?: string
  ): Message {
    return {
      content: content.replace(/\n/g, '<br>'),
      senderId: firebaseUser.uid,
      timestamp: timestamp,
      ...(fileUrl && { fileUrl }),
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
      .update({ lastMessageTimestamp: timestamp });
  }
}
