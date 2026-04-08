// mocks/auth-service.mock.ts
import { AuthFacade } from '../services/auth.facade';

export const createMockAuthService = (): jasmine.SpyObj<AuthFacade> => {

  const mockAuthService = jasmine.createSpyObj<AuthFacade>('AuthFacade', [
    'initialize',
    'login',
    'logout',
    'isAuthenticated',
    'getUserRole',
    'getUsername',
    'getAccessToken',
    'getDecodedToken',
  ]);

  // Add properties for isAuthenticated and accessToken
  mockAuthService.initialize.and.returnValue(Promise.resolve());
  mockAuthService.isAuthenticated.and.returnValue(true);
  mockAuthService.getUserRole.and.returnValue(['ADMIN']);
  mockAuthService.getUsername.and.returnValue('superadmin');
  mockAuthService.getAccessToken.and.returnValue('dummy-access-token');
  mockAuthService.getDecodedToken.and.returnValue({
          roles: ['ADMIN'],
          sub: 'superadmin',
        });

  return mockAuthService;
};
