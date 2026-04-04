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
  private readonly unauthorizedToken: DecodedToken = {
    roles: ['UNAUTHORIZED'],
    sub: 'UNAUTHORIZED'
  };

  private get isDevAuthBypassEnabled(): boolean {
    return !this.config.environment.production && !this.config.environment.authEnabled;
  }

  constructor() {
    this.oauthService.configure(this.config.authConfig);
    this.oauthService.setupAutomaticSilentRefresh();
  }

  public initializeAuth(): Promise<void> {
    if (this.isDevAuthBypassEnabled) {
      return Promise.resolve();
    }

    return this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
      if (!this.oauthService.hasValidAccessToken()) {
        this.router.navigate(['/login']);
      }
    }).catch(() => {
      this.router.navigate(['/login']);
    });
  }

  login(): void {
    if (this.isDevAuthBypassEnabled) {
      return;
    }
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    if (this.isDevAuthBypassEnabled) {
      return;
    }
    this.oauthService.logOut();
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    if (this.isDevAuthBypassEnabled) {
      return true;
    }
    return this.oauthService.hasValidAccessToken();
  }

  getUserRole(): string[] {
    if (this.isDevAuthBypassEnabled) {
      return [this.config.environment.devModeRole.toUpperCase()];
    }

    const decodedToken = this.decodeAccessToken();
    if (!decodedToken) {
      return ['UNAUTHORIZED'];
    }

    return decodedToken.roles?.map(role => role.toUpperCase()) || ['UNAUTHORIZED'];
  }

  getUsername(): string {
    if (this.isDevAuthBypassEnabled) {
      return this.config.environment.devModeUser;
    }

    return this.decodeAccessToken()?.sub ?? 'UNAUTHORIZED';
  }

  get accessToken(): string {
    if (this.isDevAuthBypassEnabled) {
      return 'dummy-access-token';
    }
    return this.oauthService.getAccessToken();
  }

  getDecodedToken(): DecodedToken {
    if (this.isDevAuthBypassEnabled) {
      return {
        roles: [this.config.environment.devModeRole],
        sub: this.config.environment.devModeUser
      };
    }

    return this.decodeAccessToken() ?? this.unauthorizedToken;
  }

  private decodeAccessToken(): DecodedToken | null {
    if (!this.accessToken) {
      return null;
    }

    try {
      return jwtDecode<DecodedToken>(this.accessToken);
    } catch {
      return null;
    }
  }
}
