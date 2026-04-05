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
    this.applyAuthConfig();
    this.oauthService.setupAutomaticSilentRefresh();
  }

  public initializeAuth(): Promise<void> {
    if (this.isDevAuthBypassEnabled) {
      return Promise.resolve();
    }

    this.applyAuthConfig();

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

    this.applyAuthConfig();
    const oauthService = this.oauthService as OAuthService & {
      loadDiscoveryDocument(): Promise<unknown>;
      createLoginUrl(
        state?: string,
        loginHint?: string,
        customRedirectUri?: string,
        noPrompt?: boolean,
        params?: object
      ): Promise<string>;
      loginUrl?: string;
      config?: {
        openUri?: (uri: string) => void;
      };
    };
    const redirectUri = this.config.authConfig.redirectUri ?? `${globalThis.location.origin}/auth/callback`;
    const openCodeFlow = () => oauthService.createLoginUrl('', '', redirectUri, false, {})
      .then((url) => {
        const openUri = oauthService.config?.openUri;
        if (openUri) {
          openUri(url);
          return;
        }

        globalThis.location.assign(url);
      })
      .catch(() => {
        this.oauthService.initCodeFlow();
      });

    if (oauthService.loginUrl) {
      void openCodeFlow();
      return;
    }

    void oauthService.loadDiscoveryDocument()
      .then(() => {
        if (redirectUri) {
          this.oauthService.redirectUri = redirectUri;
        }
        return openCodeFlow();
      })
      .catch(() => {
        this.oauthService.initCodeFlow();
      });
  }

  logout(): void {
    if (this.isDevAuthBypassEnabled) {
      return;
    }

    const oauthService = this.oauthService as OAuthService & {
      loadDiscoveryDocument(): Promise<unknown>;
      logoutUrl?: string;
    };
    const postLogoutRedirectUri = this.config.authConfig.postLogoutRedirectUri ?? globalThis.location.origin;

    if (this.config.authConfig.redirectUri) {
      this.oauthService.redirectUri = this.config.authConfig.redirectUri;
    }
    this.oauthService.postLogoutRedirectUri = postLogoutRedirectUri;

    if (oauthService.logoutUrl) {
      this.oauthService.logOut();
      return;
    }

    void oauthService.loadDiscoveryDocument()
      .then(() => {
        if (this.config.authConfig.redirectUri) {
          this.oauthService.redirectUri = this.config.authConfig.redirectUri;
        }
        this.oauthService.postLogoutRedirectUri = postLogoutRedirectUri;
        this.oauthService.logOut();
      })
      .catch(() => {
        this.oauthService.logOut(true);
        this.router.navigate(['/login']);
      });
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

  private applyAuthConfig(): void {
    const authConfig = { ...this.config.authConfig };

    this.oauthService.configure(authConfig);

    // The OAuth library falls back to window.location.origin when redirectUri
    // is unset internally, so pin the resolved callback URL before each flow.
    if (authConfig.redirectUri) {
      this.oauthService.redirectUri = authConfig.redirectUri;
    }
    if (authConfig.postLogoutRedirectUri) {
      this.oauthService.postLogoutRedirectUri = authConfig.postLogoutRedirectUri;
    }
  }
}
