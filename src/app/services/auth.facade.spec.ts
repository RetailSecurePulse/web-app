import { TestBed } from '@angular/core/testing';
import { AuthFacade } from './auth.facade';
import { Router } from '@angular/router';
import { OAuthAuthenticationService, DecodedToken } from './oauth-authentication.service';
import { OAuthService } from 'angular-oauth2-oidc';

describe('AuthFacade', () => {
  let service: AuthFacade;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockOAuth: jasmine.SpyObj<OAuthAuthenticationService>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockOAuth = jasmine.createSpyObj('OAuthAuthenticationService', [
      'initializeAuth',
      'login',
      'logout',
      'getUserRole',
      'getUsername',
      'getAuthorizationToken',
      'getDecodedToken'
    ], {
      isAuthenticated: true,
      accessToken: 'dummy-token'
    });

    const mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'configure',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'getAccessToken',
      'initCodeFlow',
      'logOut'
    ]);
  
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: OAuthAuthenticationService, useValue: mockOAuth },
        { provide: OAuthService, useValue: mockOAuthService }, // <-- Add this line
        AuthFacade
      ]
    });
    service = TestBed.inject(AuthFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call initializeAuth on initialize', async () => {
    mockOAuth.initializeAuth.and.returnValue(Promise.resolve());
    await expectAsync(service.initialize()).toBeResolved();
    expect(mockOAuth.initializeAuth).toHaveBeenCalled();
  });

  it('should call login on login', () => {
    service.login();
    expect(mockOAuth.login).toHaveBeenCalled();
  });

  it('should call logout on logout', () => {
    service.logout();
    expect(mockOAuth.logout).toHaveBeenCalled();
  });

  it('should return isAuthenticated from oauth service', () => {
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should return user roles from oauth service', () => {
    mockOAuth.getUserRole.and.returnValue(['ADMIN', 'USER']);
    expect(service.getUserRole()).toEqual(['ADMIN', 'USER']);
  });

  it('should return username from oauth service', () => {
    mockOAuth.getUsername.and.returnValue('testuser');
    expect(service.getUsername()).toBe('testuser');
  });

  it('should return decoded token from oauth service', () => {
    const decoded: DecodedToken = { roles: ['ADMIN'], sub: 'testuser' };
    mockOAuth.getDecodedToken.and.returnValue(decoded);
    expect(service.getDecodedToken()).toEqual(decoded);
  });

  it('should return an authorization token from oauth service', async () => {
    mockOAuth.getAuthorizationToken.and.returnValue(Promise.resolve('fresh-token'));

    await expectAsync(service.getAuthorizationToken()).toBeResolvedTo('fresh-token');
  });

  describe('navigateToAuthenticatedUser', () => {
    it('should navigate to /admin for ADMIN role', () => {
      spyOn(service, 'getUserRole').and.returnValue(['ADMIN']);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should navigate to /admin for SUPER role', () => {
      spyOn(service, 'getUserRole').and.returnValue(['SUPER']);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should navigate to /manager for MANAGER role', () => {
      spyOn(service, 'getUserRole').and.returnValue(['MANAGER']);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/manager']);
    });

    it('should navigate to /cashier for CASHIER role', () => {
      spyOn(service, 'getUserRole').and.returnValue(['CASHIER']);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cashier']);
    });

    it('should navigate to / for unknown role', () => {
      spyOn(service, 'getUserRole').and.returnValue(['UNKNOWN']);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should navigate to / for empty roles', () => {
      spyOn(service, 'getUserRole').and.returnValue([]);
      service.navigateToAuthenticatedUser();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  // Edge: getUserRole returns undefined
  it('should handle undefined user roles gracefully', () => {
    mockOAuth.getUserRole.and.returnValue(undefined as any);
    expect(service.getUserRole()).toBeUndefined();
  });

  // Edge: getDecodedToken returns null
  it('should handle null decoded token gracefully', () => {
    mockOAuth.getDecodedToken.and.returnValue(null as any);
    expect(service.getDecodedToken()).toBeNull();
  });
});
