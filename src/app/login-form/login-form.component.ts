import { MessageModule } from 'primeng/message';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../services/auth.facade';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [MessageModule]
})
export class LoginFormComponent implements OnInit {
  constructor(private router: Router, private authFacade: AuthFacade) {}

  ngOnInit(): void {
    this.authFacade.initialize().then(() => {
      if (this.authFacade.isAuthenticated()) {
        console.log("User is authenticated.");
        this.authFacade.navigateToAuthenticatedUser();
      } else {
        console.log("User is not logged in.");
        this.router.navigate(['/login']);
      }
    }).catch(error => {
      // Handle the error here
      console.error('Initialization failed:', error);
      // Optionally, show a message or redirect
      this.router.navigate(['/login']);
    });
  }

  onLogin(): void {
    console.log("Logging in...");
    this.authFacade.login();
  }
}
