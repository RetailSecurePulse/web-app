import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {
  private readonly authFacade = inject(AuthFacade);

  protected get isAuthenticated(): boolean {
    return this.authFacade.isAuthenticated();
  }

  protected continueAsAuthenticatedUser(): void {
    this.authFacade.navigateToAuthenticatedUser();
  }

  protected startSignIn(): void {
    this.authFacade.login();
  }
}
