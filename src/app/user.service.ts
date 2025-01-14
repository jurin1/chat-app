import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { environment } from '../environments/environment';
import { doc, docData } from '@angular/fire/firestore';

/**
 * Represents a user with a unique ID and display name.
 */
interface User {
  uid: string;
  displayName: string;
}

/**
 * Injectable service for managing user data.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  /**
   *  Dummy user data for development purposes.
   */
  private dummyUsers: User[] = [
    { uid: 'user1', displayName: 'User 1' },
    { uid: 'user2', displayName: 'User 2' },
    { uid: 'user3', displayName: 'User 3' },
  ];

  /**
   * Constructor for UserService.
   * @param {AngularFirestore} firestore - AngularFirestore service for database interaction.
   */
  constructor(private firestore: AngularFirestore) {}

  /**
   * Retrieves a list of users.
   * It fetches data from Firestore in production, or uses dummy data in development.
   * @returns {Observable<User[]>} An Observable that emits an array of users.
   */
  getUsers(): Observable<User[]> {
    return environment.production
      ? this.fetchUsersFromFirestore()
      : this.getDummyUsers();
  }

  /**
   * Fetches users from Firestore.
   * @returns {Observable<User[]>} Observable that emits an array of users from Firestore.
   */
  private fetchUsersFromFirestore(): Observable<User[]> {
    return this.firestore.collection<User>('users').valueChanges({
      idField: 'uid',
    });
  }

  /**
   * Returns dummy users for development.
   * @returns {Observable<User[]>} Observable that emits an array of dummy users.
   */
  private getDummyUsers(): Observable<User[]> {
    return of(this.dummyUsers);
  }

  /**
   * Retrieves a single user by their UID.
   * It fetches data from Firestore in production, or uses dummy data in development.
   * @param {string} uid - The unique ID of the user.
   * @returns {Observable<User | undefined>} An Observable that emits the user or undefined if not found.
   */
  getUser(uid: string): Observable<User | undefined> {
    return environment.production
      ? this.fetchUserFromFirestore(uid)
      : this.getDummyUser(uid);
  }

  /**
   * Fetches a single user from Firestore by UID.
   * @param {string} uid - The unique ID of the user.
   * @returns {Observable<User | undefined>} Observable that emits the user or undefined.
   */
  private fetchUserFromFirestore(uid: string): Observable<User | undefined> {
    if (!uid) {
      return of(undefined);
    }
    const userDoc = doc(this.firestore.firestore, 'users', uid);
    return docData(userDoc, { idField: 'uid' }) as Observable<User>;
  }

  /**
   * Retrieves a dummy user by their UID.
   * @param {string} uid - The unique ID of the user.
   * @returns {Observable<User | undefined>} An Observable that emits the user or undefined.
   */
  private getDummyUser(uid: string): Observable<User | undefined> {
    const user = this.dummyUsers.find((user) => user.uid === uid);
    return of(user);
  }
}
