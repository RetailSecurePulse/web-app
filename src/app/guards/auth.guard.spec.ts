import { authGuard } from './auth.guard';
import { AuthFacade } from '../services/auth.facade';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('authGuard', () => {
  let guard: authGuard;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthFacade = jasmine.createSpyObj('AuthFacade', ['isAuthenticated']);
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
    expect(guard.canActivate()).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to /login and return false if user is not authenticated', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    expect(guard.canActivate()).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle edge case where router.navigate throws', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockRouter.navigate.and.throwError('Navigation error');
    expect(() => guard.canActivate()).toThrowError('Navigation error');
  });

  it('should call isAuthenticated exactly once per canActivate', () => {
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    guard.canActivate();
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalledTimes(1);
  });
});