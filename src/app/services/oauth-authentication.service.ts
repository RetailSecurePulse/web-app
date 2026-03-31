import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { ConfigService } from '../services/config.service';

export interface DecodedToken {
  roles: Array<string>;
  sub: string;
}

@Injectable({
  providedIn: 'root'
})
export class OAuthAuthenticationService {
  private readonly router: Router = inject(Router);
  private readonly oauthService: OAuthService = inject(OAuthService);
  private readonly config: ConfigService = inject(ConfigService);

  constructor() {
    this.oauthService.configure(this.config.authConfig);
    this.oauthService.setupAutomaticSilentRefresh();
  }

  public initializeAuth(): Promise<void> {
    if (!this.config.environment.authEnabled) {
      console.log('Authentication is disabled. Using dummy token.');
      return Promise.resolve();
    }

    return this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
      if (this.oauthService.hasValidAccessToken()) {
        console.log('Token: \r\n' + this.accessToken);
      } else {
        console.log('User is not logged in');
        this.router.navigate(['/login']);
      }
    }).catch(error => {
      console.log('Error during OAuth configuration', error);
      this.router.navigate(['/login']);
    });
  }

  login(): void {
    if (!this.config.environment.authEnabled) {
      console.log('Authentication is disabled');
      return;
    }
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    if (!this.config.environment.authEnabled) {
      console.log('Authentication is disabled');
      return;
    }
    this.oauthService.logOut();
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    if (!this.config.environment.authEnabled) {
      console.log('Authentication is disabled');
      return true;
    }
    return this.oauthService.hasValidAccessToken();
  }

  getUserRole(): string[] {
    if (!this.config.environment.authEnabled) {
      return [this.config.environment.devModeRole.toUpperCase()];
    }

    if (!this.accessToken) {
      return ['UNAUTHORIZED'];
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(this.accessToken);
      return decodedToken.roles?.map(role => role.toUpperCase()) || ['UNAUTHORIZED'];
    } catch (error) {
      console.error('Error decoding token:', error);
      return ['UNAUTHORIZED'];
    }
  }

  getUsername(): string {
    console.log('Casper Auth Mode: ' + this.config.environment.authEnabled);
    if (!this.config.environment.authEnabled) {
      return this.config.environment.devModeUser;
    }
    if (!this.accessToken) {
      return 'UNAUTHORIZED';
    }
    const decodedToken: DecodedToken = jwtDecode(this.accessToken);
    return decodedToken.sub;
  }

  get accessToken(): string {
    if (!this.config.environment.authEnabled) {
      return 'dummy-access-token';
    }
    return this.oauthService.getAccessToken();
  }

  getDecodedToken(): DecodedToken {
    if (!this.config.environment.authEnabled) {
      console.log('Authentication is disabled');
      return {
        roles: [this.config.environment.devModeRole],
        sub: this.config.environment.devModeUser
      };
    }
    return jwtDecode(this.accessToken);
  }
}