import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DecodedToken, OAuthAuthenticationService } from './oauth-authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthFacade {
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

  getAuthorizationToken(): Promise<string> {
    return this.oauthAuthService.getAuthorizationToken();
  }

  getDecodedToken(): DecodedToken {
    return this.oauthAuthService.getDecodedToken();
  }

  navigateToAuthenticatedUser(): void {
    // Keep the route decision in one place so the landing page, callback flow,
    // and guard-driven redirects all resolve users to the same shell route.
    const userRoles = this.getUserRole();
    if (userRoles.includes('ADMIN') || userRoles.includes('SUPER')) {
      this.router.navigate(['/admin']);
    } else if (userRoles.includes('MANAGER')) {
      this.router.navigate(['/manager']);
    } else if (userRoles.includes('INVENTORY_MANAGER')) {
      this.router.navigate(['/inventory-manager']);
    } else if (userRoles.includes('CASHIER')) {
      this.router.navigate(['/cashier']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
