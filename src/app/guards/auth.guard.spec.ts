import { authGuard } from './auth.guard';
import { AuthFacade } from '../services/auth.facade';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('authGuard', () => {
  let guard: authGuard;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;
  let mockRouter: jasmine.SpyObj<Router>;

  const createRoute = (roles?: string[]): ActivatedRouteSnapshot =>
    ({ data: roles ? { roles } : {} } as ActivatedRouteSnapshot);

  beforeEach(() => {
    mockAuthFacade = jasmine.createSpyObj('AuthFacade', [
      'isAuthenticated',
      'getUserRole',
      'navigateToAuthenticatedUser'
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: mockAuthFacade },
        { provide: Router, useValue: mockRouter },
        authGuard
      ]
    });

    guard = TestBed.inject(authGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true if user is authenticated', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    mockAuthFacade.getUserRole.and.returnValue(['ADMIN']);
    expect(guard.canActivate(createRoute())).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to /login and return false if user is not authenticated', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    expect(guard.canActivate(createRoute())).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return true when user has one of required roles', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    mockAuthFacade.getUserRole.and.returnValue(['MANAGER']);
    expect(guard.canActivate(createRoute(['ADMIN', 'MANAGER']))).toBeTrue();
    expect(mockAuthFacade.navigateToAuthenticatedUser).not.toHaveBeenCalled();
  });

  it('should redirect authenticated user when required roles are missing', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    mockAuthFacade.getUserRole.and.returnValue(['CASHIER']);
    expect(guard.canActivate(createRoute(['ADMIN']))).toBeFalse();
    expect(mockAuthFacade.navigateToAuthenticatedUser).toHaveBeenCalled();
  });

  it('should call isAuthenticated exactly once per canActivate', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    mockAuthFacade.getUserRole.and.returnValue(['ADMIN']);
    guard.canActivate(createRoute(['ADMIN']));
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalledTimes(1);
  });
});
