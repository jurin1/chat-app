import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@firebase/auth';

/**
 * Service for handling user authentication and authorization.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * Dummy user data for development purposes.
   */
  private dummyUsers: User[] = [
    { uid: 'user1', displayName: 'User 1' } as User,
    { uid: 'user2', displayName: 'User 2' } as User,
  ];

  /**
   * Index of the currently selected dummy user.
   */
  private currentUserIndex = 0;

  /**
   * BehaviorSubject to hold the current user.
   */
  private _user = new BehaviorSubject<User | null>(
    this.dummyUsers[this.currentUserIndex]
  );

  /**
   * Observable that emits the current user.
   */
  user: Observable<User | null> = this._user.asObservable();

  /**
   * Constructor for AuthService.
   * @param {AngularFireAuth} auth - AngularFireAuth service for Firebase authentication.
   */
  constructor(public auth: AngularFireAuth) {
    this.logInitialUser();
  }

  /**
   * Logs the initial user value.
   */
  private logInitialUser(): void {
    console.log('AuthService initialized with user', this._user.value);
  }

  /**
   * Initiates the Google sign-in process.
   * @returns {Promise<void>} A Promise that resolves when the sign-in is initiated.
   */
  googleSignIn(): Promise<void> {
    return Promise.resolve();
    // In a real app, this would use `this.auth.signInWithPopup(new GoogleAuthProvider())`
  }

  /**
   * Signs the current user out.
   * @returns {Promise<void>} A Promise that resolves when the sign-out is complete.
   */
  signOut(): Promise<void> {
    return Promise.resolve();
    // In a real app, this would use `this.auth.signOut()`
  }

  /**
   * Switches to the next dummy user for development.
   */
  switchUser(): void {
    this.updateCurrentUserIndex();
    this.updateUserSubject();
    this.logCurrentUser();
  }

  /**
   * Updates the current user index to switch to the next dummy user.
   */
  private updateCurrentUserIndex(): void {
    this.currentUserIndex =
      (this.currentUserIndex + 1) % this.dummyUsers.length;
  }

  /**
   * Updates the user BehaviorSubject with the new dummy user.
   */
  private updateUserSubject(): void {
    this._user.next(this.dummyUsers[this.currentUserIndex]);
  }

  /**
   * Logs the currently selected user.
   */
  private logCurrentUser(): void {
    console.log('Switch user to:', this._user.value);
  }
}
