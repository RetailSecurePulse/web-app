import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { LogoutButtonComponent } from './logout-button.component';
import { AuthFacade } from '../services/auth.facade';
import { Router } from '@angular/router';

describe('LogoutButtonComponent', () => {
  let component: LogoutButtonComponent;
  let fixture: ComponentFixture<LogoutButtonComponent>;
  let mockAuthService: jasmine.SpyObj<AuthFacade>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthFacade', ['isAuthenticated', 'logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LogoutButtonComponent],
      providers: [
        provideHttpClient(),
        { provide: AuthFacade, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LogoutButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should logout and navigate to /login if authenticated', () => {
    spyOn(console, 'log');
    mockAuthService.isAuthenticated.and.returnValue(true);
    component.onLogout();
    expect(console.log).toHaveBeenCalledWith('Logging out...');
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should only navigate to /login if not authenticated', () => {
    spyOn(console, 'log');
    mockAuthService.isAuthenticated.and.returnValue(false);
    component.onLogout();
    expect(console.log).toHaveBeenCalledWith('Logging out...');
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthService.logout).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle error if router.navigate throws', () => {
    spyOn(console, 'log');
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.logout.and.callThrough();
    mockRouter.navigate.and.throwError('Navigation error');
    expect(() => component.onLogout()).toThrowError('Navigation error');
    expect(console.log).toHaveBeenCalledWith('Logging out...');
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});