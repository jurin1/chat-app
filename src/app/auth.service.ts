import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private dummyUsers = [
    { uid: 'user1', displayName: 'User 1' } as User,
    { uid: 'user2', displayName: 'User 2' } as User,
  ];
  private currentUserIndex = 0;
  private _user = new BehaviorSubject<User | null>(
    this.dummyUsers[this.currentUserIndex]
  );
  user: Observable<User | null> = this._user.asObservable();

  constructor(public auth: AngularFireAuth) {
    console.log('AuthService initialized with user', this._user.value);
  }

  googleSignIn() {
    return Promise.resolve();
  }

  signOut() {
    return Promise.resolve();
  }

  switchUser() {
    this.currentUserIndex =
      (this.currentUserIndex + 1) % this.dummyUsers.length;
    this._user.next(this.dummyUsers[this.currentUserIndex]);
    console.log('Switch user to:', this._user.value);
  }
}
