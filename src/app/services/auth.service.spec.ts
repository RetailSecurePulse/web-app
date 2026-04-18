import { TestBed } from '@angular/core/testing';

import { OAuthService } from 'angular-oauth2-oidc';
import { EMPTY } from 'rxjs';
import { AuthFacade } from './auth.facade';

describe('AuthService', () => {
  let service: AuthFacade;

  beforeEach(() => {

    const mockOAuthService = jasmine.createSpyObj(
      'OAuthService',
      [
        'configure',
        'setupAutomaticSilentRefresh',
        'loadDiscoveryDocumentAndLogin',
        'loadDiscoveryDocumentAndTryLogin',
        'loadDiscoveryDocument',
        'logOut',
        'hasValidAccessToken',
        'getAccessToken',
        'getIdentityClaims',
        'getAccessTokenExpiration',
        'getRefreshToken',
        'refreshToken',
        'initCodeFlow',
      ],
      {
        events: EMPTY,
      }
    );

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: OAuthService, useValue: mockOAuthService }, // Provide the mock OAuthService
      ],
    });
    service = TestBed.inject(AuthFacade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
