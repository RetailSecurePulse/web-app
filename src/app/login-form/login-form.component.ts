import { MessageModule } from 'primeng/message';
import { Component, OnInit } from '@angular/core';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [MessageModule]
})
export class LoginFormComponent implements OnInit {
  constructor(private authFacade: AuthFacade) {}

  ngOnInit(): void {
    this.authFacade.initialize().then(() => {
      if (this.authFacade.isAuthenticated()) {
        this.authFacade.navigateToAuthenticatedUser();
      }
    }).catch(error => {
      console.error('Initialization failed:', error);
    });
  }

  onLogin(): void {
    this.authFacade.login();
  }
}
