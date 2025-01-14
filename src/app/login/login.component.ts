import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { MatButtonModule } from '@angular/material/button';

/**
 * Component for handling user login.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  /**
   * Constructor for LoginComponent.
   * @param {AuthService} auth - AuthService for handling user authentication.
   */
  constructor(public auth: AuthService) {
    this.logComponentInitialization();
  }

    /**
     * Logs the initialization of the component.
     */
    private logComponentInitialization(): void {
        console.log('LoginComponent initialized');
    }

  /**
   * Initiates the login process using Google Sign-In.
   */
  login(): void {
    this.logLoginCall();
    this.auth.googleSignIn();
  }

    /**
     * Logs when the login method is called.
     */
    private logLoginCall(): void {
        console.log('Login method called');
    }
}