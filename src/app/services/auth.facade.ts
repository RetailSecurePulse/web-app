import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthAuthenticationService, DecodedToken } from './oauth-authentication.service';
import {JwtPayload} from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthFacade { // Renamed class to AuthFacade
  constructor(
    private router: Router,
    private oauthAuthService: OAuthAuthenticationService
  ) {}

  initialize(): Promise<void> {
    return this.oauthAuthService.initializeAuth();
  }

  login(): void {
    this.oauthAuthService.login();
  }

  logout(): void {
    this.oauthAuthService.logout();
  }

  isAuthenticated(): boolean {
    return this.oauthAuthService.isAuthenticated;
  }

  getUserRole(): string[] {
    return this.oauthAuthService.getUserRole();
  }

  getUsername(): string {
    return this.oauthAuthService.getUsername();
  }

  getAccessToken(): string {
    return this.oauthAuthService.accessToken;
  }

  getDecodedToken(): DecodedToken | JwtPayload {
    return this.oauthAuthService.getDecodedToken();
  }

  navigateToAuthenticatedUser(): void {
    const userRoles = this.getUserRole();
    if (userRoles.includes("ADMIN") || userRoles.includes("SUPER")) {
      this.router.navigate(['/admin']);
    } else if (userRoles.includes("MANAGER")) {
      this.router.navigate(['/manager']);
    } else if (userRoles.includes("INVENTORY_MANAGER")) {
      this.router.navigate(['/inventory-manager']);
    } else if (userRoles.includes("CASHIER")) {
      this.router.navigate(['/cashier']);
    } else {
      this.router.navigate(['/']); // Default route
    }
  }
}
