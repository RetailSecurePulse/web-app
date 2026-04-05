import { Component } from '@angular/core';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'logout-button',
  imports: [],
  templateUrl: './logout-button.component.html',
  styleUrl: './logout-button.component.css'
})
export class LogoutButtonComponent {
  constructor(private authService: AuthFacade) { }

  onLogout(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.logout();
    }
  }
}
