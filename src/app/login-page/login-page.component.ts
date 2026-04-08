import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private readonly authFacade = inject(AuthFacade);

  protected get isAuthenticated(): boolean {
    return this.authFacade.isAuthenticated();
  }

  protected continueToIdentityAccessManagement(): void {
    this.authFacade.login();
  }

  protected continueAsAuthenticatedUser(): void {
    this.authFacade.navigateToAuthenticatedUser();
  }
}
