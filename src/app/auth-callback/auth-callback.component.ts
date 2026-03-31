import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="d-flex layout">
      <div class="content flex-md-grow-1 main-content">
        <div class="login-container">
          <h2 class="title">Completing sign in</h2>
          <p class="subtitle">Please wait while we finish your login.</p>
        </div>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private readonly authFacade: AuthFacade,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authFacade.initialize().then(() => {
      if (this.authFacade.isAuthenticated()) {
        this.authFacade.navigateToAuthenticatedUser();
      } else {
        this.router.navigate(['/login']);
      }
    }).catch(error => {
      console.error('Callback initialization failed:', error);
      this.router.navigate(['/login']);
    });
  }
}
