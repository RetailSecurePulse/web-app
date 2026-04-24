import { TestBed } from '@angular/core/testing';

import { Router } from '@angular/router';
import { AuthFacade } from './auth.facade';
import { OAuthAuthenticationService } from './oauth-authentication.service';

describe('AuthService', () => {
  let service: AuthFacade;

  beforeEach(() => {
    const mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const mockOAuthAuthenticationService = jasmine.createSpyObj<OAuthAuthenticationService>(
      'OAuthAuthenticationService',
      [
        'initializeAuth',
        'login',
        'logout',
        'getUserRole',
        'getUsername',
        'getAuthorizationToken',
        'getDecodedToken'
      ],
      {
        isAuthenticated: true,
        accessToken: 'test-token'
      }
    );

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: Router, useValue: mockRouter },
        { provide: OAuthAuthenticationService, useValue: mockOAuthAuthenticationService },
      ],
    });
    service = TestBed.inject(AuthFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
