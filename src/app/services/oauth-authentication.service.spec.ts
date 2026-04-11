// oauth-authentication.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';

import { OAuthAuthenticationService } from './oauth-authentication.service';
import { ConfigService } from '../services/config.service';

describe('OAuthAuthenticationService', () => {
  let service: OAuthAuthenticationService;
  let mockOAuthService: jasmine.SpyObj<OAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let configSpy: jasmine.SpyObj<ConfigService>;
  let oauthEvents: Subject<{ type: string; info?: string }>;

  beforeEach(() => {
    oauthEvents = new Subject();
    mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'configure',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocument',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'getAccessToken',
      'getAccessTokenExpiration',
      'getRefreshToken',
      'refreshToken',
      'createLoginUrl',
      'initCodeFlow',
      'logOut',
    ]);
    Object.defineProperty(mockOAuthService, 'events', {
      value: oauthEvents.asObservable(),
      configurable: true
    });
    mockOAuthService.loadDiscoveryDocument.and.returnValue(Promise.resolve({} as any));
    mockOAuthService.getAccessTokenExpiration.and.returnValue(Date.now() + 60_000);
    mockOAuthService.getRefreshToken.and.returnValue('refresh-token');
    mockOAuthService.refreshToken.and.returnValue(Promise.resolve({} as any));
    (mockOAuthService as any).createLoginUrl.and.returnValue(Promise.resolve('http://localhost:30081/auth/oauth2/authorize'));
    (mockOAuthService as any).config = {
      openUri: jasmine.createSpy('openUri')
    };
    (mockOAuthService as any).loginUrl = 'http://localhost:30081/auth/oauth2/authorize';
    (mockOAuthService as any).tokenEndpoint = 'http://localhost:30081/auth/oauth2/token';

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Provide mutable environment values through ConfigService
    configSpy = jasmine.createSpyObj('ConfigService', [], {
      authConfig: {
        dummy: true,
        responseType: 'code',
        redirectUri: 'http://localhost:30080/auth/callback',
        postLogoutRedirectUri: 'http://localhost:30080'
      }, // shape not important for test
      environment: {
        production: false,
        authEnabled: true,
        devModeRole: 'ADMIN',
        devModeUser: 'devuser',
        stripePublicKey: 'pk_test_dummy',
      },
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ConfigService, useValue: configSpy },
        OAuthAuthenticationService,
      ],
    });

    service = TestBed.inject(OAuthAuthenticationService);
  });

  it('should use explicit refresh-token renewal for code flow instead of library silent refresh', async () => {
    oauthEvents.next({ type: 'token_expires', info: 'access_token' });
    await Promise.resolve();

    expect(mockOAuthService.refreshToken).toHaveBeenCalled();
    expect(mockOAuthService.setupAutomaticSilentRefresh).not.toHaveBeenCalled();
  });

  it('should not try a refresh when no refresh token is available', async () => {
    mockOAuthService.getRefreshToken.and.returnValue('');

    oauthEvents.next({ type: 'token_expires', info: 'access_token' });
    await Promise.resolve();

    expect(mockOAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should proactively refresh before returning an authorization token when access token is near expiry', async () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(true);
    mockOAuthService.getAccessTokenExpiration.and.returnValue(Date.now() + 5_000);
    mockOAuthService.getAccessToken.and.returnValue('fresh-token');

    await expectAsync(service.getAuthorizationToken()).toBeResolvedTo('fresh-token');

    expect(mockOAuthService.refreshToken).toHaveBeenCalled();
  });

  it('should load the discovery document before refreshing when tokenEndpoint is missing', async () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(true);
    mockOAuthService.getAccessTokenExpiration.and.returnValue(Date.now() + 5_000);
    (mockOAuthService as any).tokenEndpoint = undefined;

    await service.getAuthorizationToken();

    expect(mockOAuthService.loadDiscoveryDocument).toHaveBeenCalled();
    expect(mockOAuthService.refreshToken).toHaveBeenCalled();
  });

  it('should not proactively refresh when access token still has enough time left', async () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(true);
    mockOAuthService.getAccessTokenExpiration.and.returnValue(Date.now() + 120_000);
    mockOAuthService.getAccessToken.and.returnValue('current-token');

    await expectAsync(service.getAuthorizationToken()).toBeResolvedTo('current-token');

    expect(mockOAuthService.refreshToken).not.toHaveBeenCalled();
  });

  describe('initializeAuth', () => {
    it('should resolve immediately if auth is disabled in non-production', async () => {
      configSpy.environment.production = false;
      configSpy.environment.authEnabled = false;
      const result = await service.initializeAuth();
      expect(result).toBeUndefined();
    });

    it('should not bypass auth in production even if authEnabled is false', async () => {
      configSpy.environment.production = true;
      configSpy.environment.authEnabled = false;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
      mockOAuthService.hasValidAccessToken.and.returnValue(false);

      await service.initializeAuth();

      expect(mockOAuthService.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to /login if no valid token', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
      mockOAuthService.hasValidAccessToken.and.returnValue(false);

      await service.initializeAuth();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not navigate if valid token exists', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
      mockOAuthService.hasValidAccessToken.and.returnValue(true);

      await service.initializeAuth();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle error and navigate to /login', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.reject('fail'));

      await service.initializeAuth();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('login', () => {
    it('should build a code flow URL with the configured callback if auth enabled', async () => {
      configSpy.environment.authEnabled = true;

      service.login();
      await Promise.resolve();

      expect(mockOAuthService.configure).toHaveBeenCalledWith(jasmine.objectContaining({
        redirectUri: 'http://localhost:30080/auth/callback'
      }));
      expect(mockOAuthService.redirectUri).toBe('http://localhost:30080/auth/callback');
      expect((mockOAuthService as any).createLoginUrl).toHaveBeenCalledWith(
        '',
        '',
        'http://localhost:30080/auth/callback',
        false,
        {}
      );
      expect((mockOAuthService as any).config?.openUri)
        .toHaveBeenCalledWith('http://localhost:30081/auth/oauth2/authorize');
      expect(mockOAuthService.loadDiscoveryDocument).not.toHaveBeenCalled();
      expect(mockOAuthService.initCodeFlow).not.toHaveBeenCalled();
    });

    it('should load discovery before building the code flow URL when loginUrl is empty', async () => {
      configSpy.environment.authEnabled = true;
      (mockOAuthService as any).loginUrl = '';

      service.login();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockOAuthService.loadDiscoveryDocument).toHaveBeenCalled();
      expect((mockOAuthService as any).createLoginUrl).toHaveBeenCalledWith(
        '',
        '',
        'http://localhost:30080/auth/callback',
        false,
        {}
      );
    });

    it('should not call initCodeFlow if auth disabled', () => {
      configSpy.environment.authEnabled = false;

      service.login();

      expect(mockOAuthService.initCodeFlow).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear tokens and redirect to the hosted IAM logout endpoint if auth enabled', () => {
      configSpy.environment.authEnabled = true;
      (mockOAuthService as any).logoutUrl = 'http://localhost:30081/auth/connect/logout';
      configSpy.authConfig.issuer = 'http://localhost:30081/auth';

      service.logout();

      expect(mockOAuthService.postLogoutRedirectUri).toBe('http://localhost:30080');
      expect(mockOAuthService.logOut).toHaveBeenCalled();
      expect((mockOAuthService.logOut as jasmine.Spy).calls.mostRecent().args[0]).toBeTrue();
      expect((mockOAuthService as any).config?.openUri)
        .toHaveBeenCalledWith('http://localhost:30081/auth/rp-logout');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should load discovery before logout when issuer is empty', async () => {
      configSpy.environment.authEnabled = true;
      configSpy.authConfig.issuer = '';

      service.logout();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockOAuthService.loadDiscoveryDocument).toHaveBeenCalled();
      expect(mockOAuthService.postLogoutRedirectUri).toBe('http://localhost:30080');
      expect(mockOAuthService.logOut).toHaveBeenCalled();
      expect((mockOAuthService.logOut as jasmine.Spy).calls.mostRecent().args[0]).toBeTrue();
    });

    it('should not call logOut if auth disabled', () => {
      configSpy.environment.authEnabled = false;

      service.logout();

      expect(mockOAuthService.logOut).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if auth disabled', () => {
      configSpy.environment.authEnabled = false;

      expect(service.isAuthenticated).toBeTrue();
    });

    it('should return hasValidAccessToken if auth enabled', () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.hasValidAccessToken.and.returnValue(true);
      expect(service.isAuthenticated).toBeTrue();

      mockOAuthService.hasValidAccessToken.and.returnValue(false);
      expect(service.isAuthenticated).toBeFalse();
    });
  });

  describe('getUserRole', () => {
    it('should return devModeRole if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      configSpy.environment.devModeRole = 'ADMIN';

      expect(service.getUserRole()).toEqual(['ADMIN']);
    });

    it('should return UNAUTHORIZED if no accessToken', () => {
      configSpy.environment.authEnabled = true;
      spyOnProperty(service, 'accessToken').and.returnValue('');

      expect(service.getUserRole()).toEqual(['UNAUTHORIZED']);
    });

    it('should return UNAUTHORIZED if token decode fails', () => {
      configSpy.environment.authEnabled = true;
      // jwt-decode will throw on a non-JWT string
      spyOnProperty(service, 'accessToken').and.returnValue('badtoken');

      expect(service.getUserRole()).toEqual(['UNAUTHORIZED']);
    });
  });

  describe('getUsername', () => {
    it('should return devModeUser if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      configSpy.environment.devModeUser = 'devuser';

      expect(service.getUsername()).toBe('devuser');
    });

    it('should return UNAUTHORIZED if no accessToken', () => {
      configSpy.environment.authEnabled = true;
      spyOnProperty(service, 'accessToken').and.returnValue('');

      expect(service.getUsername()).toBe('UNAUTHORIZED');
    });

    it('should return UNAUTHORIZED if token decode fails', () => {
      configSpy.environment.authEnabled = true;
      spyOnProperty(service, 'accessToken').and.returnValue('badtoken');

      expect(service.getUsername()).toBe('UNAUTHORIZED');
    });
  });

  describe('accessToken', () => {
    it('should return dummy-access-token if auth disabled', () => {
      configSpy.environment.authEnabled = false;

      expect(service.accessToken).toBe('dummy-access-token');
    });

    it('should return token from oauthService if auth enabled', () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.getAccessToken.and.returnValue('real-token');

      expect(service.accessToken).toBe('real-token');
    });
  });

  describe('getDecodedToken', () => {
    it('should return dummy token if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      configSpy.environment.devModeRole = 'ADMIN';
      configSpy.environment.devModeUser = 'devuser';

      const decoded = service.getDecodedToken();

      expect(decoded.sub).toBe('devuser');
      expect(decoded.roles).toEqual(['ADMIN']);
    });

    it('should return an unauthorized token if token decode fails', () => {
      configSpy.environment.authEnabled = true;
      spyOnProperty(service, 'accessToken').and.returnValue('badtoken');

      expect(service.getDecodedToken()).toEqual({
        roles: ['UNAUTHORIZED'],
        sub: 'UNAUTHORIZED'
      });
    });
  });
});
