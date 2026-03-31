// oauth-authentication.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

import { OAuthAuthenticationService } from './oauth-authentication.service';
import { ConfigService } from '../services/config.service';

describe('OAuthAuthenticationService', () => {
  let service: OAuthAuthenticationService;
  let mockOAuthService: jasmine.SpyObj<OAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let configSpy: jasmine.SpyObj<ConfigService>;

  beforeEach(() => {
    mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'configure',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'getAccessToken',
      'initCodeFlow',
      'logOut',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Provide mutable environment values through ConfigService
    configSpy = jasmine.createSpyObj('ConfigService', [], {
      authConfig: { dummy: true }, // shape not important for test
      environment: {
        authEnabled: true,
        devModeRole: 'ADMIN',
        devModeUser: 'devuser',
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

  describe('initializeAuth', () => {
    it('should resolve immediately if auth is disabled', async () => {
      configSpy.environment.authEnabled = false;
      const result = await service.initializeAuth();
      expect(result).toBeUndefined();
    });

    it('should navigate to /login if no valid token', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
      mockOAuthService.hasValidAccessToken.and.returnValue(false);

      await service.initializeAuth();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should log token if valid token exists', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
      mockOAuthService.hasValidAccessToken.and.returnValue(true);
      mockOAuthService.getAccessToken.and.returnValue('real-token');

      const logSpy = spyOn(console, 'log');

      await service.initializeAuth();

      expect(logSpy).toHaveBeenCalledWith('Token: \r\n' + service.accessToken);
    });

    it('should handle error and navigate to /login', async () => {
      configSpy.environment.authEnabled = true;
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.reject('fail'));

      const logSpy = spyOn(console, 'log');

      await service.initializeAuth();

      expect(logSpy).toHaveBeenCalledWith('Error during OAuth configuration', 'fail');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('login', () => {
    it('should call initCodeFlow if auth enabled', () => {
      configSpy.environment.authEnabled = true;

      service.login();

      expect(mockOAuthService.initCodeFlow).toHaveBeenCalled();
    });

    it('should not call initCodeFlow if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      const logSpy = spyOn(console, 'log');

      service.login();

      expect(mockOAuthService.initCodeFlow).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Authentication is disabled');
    });
  });

  describe('logout', () => {
    it('should call logOut and navigate to /login if auth enabled', () => {
      configSpy.environment.authEnabled = true;

      service.logout();

      expect(mockOAuthService.logOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not call logOut if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      const logSpy = spyOn(console, 'log');

      service.logout();

      expect(mockOAuthService.logOut).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Authentication is disabled');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if auth disabled', () => {
      configSpy.environment.authEnabled = false;
      const logSpy = spyOn(console, 'log');

      expect(service.isAuthenticated).toBeTrue();
      expect(logSpy).toHaveBeenCalledWith('Authentication is disabled');
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

      const errorSpy = spyOn(console, 'error');

      expect(service.getUserRole()).toEqual(['UNAUTHORIZED']);
      expect(errorSpy).toHaveBeenCalled(); // logs from catch block
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
  });
});
