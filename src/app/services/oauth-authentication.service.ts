import { Injectable, inject } from '@angular/core';
import { OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfigService } from '../services/config.service';

export interface DecodedToken {
  roles: Array<string>;
  sub: string;
}

@Injectable({
  providedIn: 'root'
})
export class OAuthAuthenticationService {
  private static readonly TOKEN_REFRESH_BUFFER_MS = 30_000;
  private readonly router: Router = inject(Router);
  private readonly oauthService: OAuthService = inject(OAuthService);
  private readonly config: ConfigService = inject(ConfigService);
  private tokenRefreshSubscription?: Subscription;
  private refreshInFlight: Promise<void> | null = null;
  private readonly unauthorizedToken: DecodedToken = {
    roles: ['UNAUTHORIZED'],
    sub: 'UNAUTHORIZED'
  };

  private get isDevAuthBypassEnabled(): boolean {
    return !this.config.environment.production && !this.config.environment.authEnabled;
  }

  constructor() {
    this.applyAuthConfig();
    this.configureAutomaticTokenRenewal();
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
      clientId?: string;
      config?: {
        openUri?: (uri: string) => void;
      };
    };
    const postLogoutRedirectUri = this.config.authConfig.postLogoutRedirectUri ?? globalThis.location.origin;
    const issuer = this.config.authConfig.issuer ?? '';

    if (this.config.authConfig.redirectUri) {
      this.oauthService.redirectUri = this.config.authConfig.redirectUri;
    }
    this.oauthService.postLogoutRedirectUri = postLogoutRedirectUri;

    const hostedLogoutUrl = this.buildHostedLogoutUrl(issuer);
    if (hostedLogoutUrl) {
      this.redirectToHostedLogout(hostedLogoutUrl);
      return;
    }

    void oauthService.loadDiscoveryDocument()
      .then(() => {
        if (this.config.authConfig.redirectUri) {
          this.oauthService.redirectUri = this.config.authConfig.redirectUri;
        }
        this.oauthService.postLogoutRedirectUri = postLogoutRedirectUri;
        const refreshedHostedLogoutUrl = this.buildHostedLogoutUrl(this.config.authConfig.issuer ?? issuer);
        if (refreshedHostedLogoutUrl) {
          this.redirectToHostedLogout(refreshedHostedLogoutUrl);
          return;
        }

        this.oauthService.logOut(true);
        this.router.navigate(['/login']);
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

  async getAuthorizationToken(): Promise<string> {
    if (this.isDevAuthBypassEnabled) {
      return 'dummy-access-token';
    }

    await this.ensureFreshAccessToken();
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

  private configureAutomaticTokenRenewal(): void {
    this.tokenRefreshSubscription?.unsubscribe();

    if (this.config.authConfig.responseType !== 'code') {
      this.oauthService.setupAutomaticSilentRefresh();
      return;
    }

    this.tokenRefreshSubscription = this.oauthService.events.subscribe((event) => {
      if (!this.isAccessTokenExpiryEvent(event)) {
        return;
      }

      void this.refreshAccessToken();
    });
  }

  private isAccessTokenExpiryEvent(event: OAuthEvent): boolean {
    return event.type === 'token_expires'
      && (event as OAuthEvent & { info?: unknown }).info === 'access_token';
  }

  private refreshAccessToken(): Promise<void> {
    if (this.isDevAuthBypassEnabled) {
      return Promise.resolve();
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    if (!this.oauthService.getRefreshToken()) {
      return Promise.resolve();
    }

    this.refreshInFlight = this.ensureDiscoveryDocumentLoaded()
      .then(() => this.oauthService.refreshToken())
      .then(() => undefined)
      .catch(() => {
        this.router.navigate(['/login']);
      })
      .finally(() => {
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }

  private ensureDiscoveryDocumentLoaded(): Promise<void> {
    const oauthService = this.oauthService as OAuthService & {
      loadDiscoveryDocument?: () => Promise<unknown>;
      tokenEndpoint?: string | null;
    };

    if (oauthService.tokenEndpoint) {
      return Promise.resolve();
    }

    return oauthService.loadDiscoveryDocument?.()
      .then(() => undefined) ?? Promise.resolve();
  }

  private ensureFreshAccessToken(): Promise<void> {
    if (this.isDevAuthBypassEnabled || !this.shouldRefreshAccessToken()) {
      return Promise.resolve();
    }

    return this.refreshAccessToken();
  }

  private shouldRefreshAccessToken(): boolean {
    if (!this.oauthService.getRefreshToken()) {
      return false;
    }

    if (!this.oauthService.hasValidAccessToken()) {
      return true;
    }

    const expiration = (this.oauthService as OAuthService & {
      getAccessTokenExpiration?: () => number;
    }).getAccessTokenExpiration?.();

    if (!expiration) {
      return false;
    }

    return expiration - Date.now() <= OAuthAuthenticationService.TOKEN_REFRESH_BUFFER_MS;
  }

  private redirectToHostedLogout(logoutUrl: string): void {
    this.oauthService.logOut(true);
    const openUri = (this.oauthService as OAuthService & { config?: { openUri?: (uri: string) => void } }).config?.openUri;
    if (openUri) {
      openUri(logoutUrl);
      return;
    }

    globalThis.location.assign(logoutUrl);
  }

  private buildHostedLogoutUrl(issuer?: string): string | null {
    if (!issuer) {
      return null;
    }

    const normalizedIssuer = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
    return `${normalizedIssuer}/rp-logout`;
  }
}
