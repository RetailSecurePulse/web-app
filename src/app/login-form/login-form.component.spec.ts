import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

import { LoginFormComponent } from './login-form.component';
import { AuthFacade } from '../services/auth.facade';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthFacade = jasmine.createSpyObj('AuthFacade', [
      'initialize',
      'isAuthenticated',
      'navigateToAuthenticatedUser',
      'login'
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthFacade, useValue: mockAuthFacade },
        { provide: Router, useValue: mockRouter },
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to authenticated user if already authenticated on ngOnInit', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(true);
    spyOn(console, 'log');
    component.ngOnInit();
    tick();
    expect(mockAuthFacade.initialize).toHaveBeenCalled();
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('User is authenticated.');
    expect(mockAuthFacade.navigateToAuthenticatedUser).toHaveBeenCalled();
  }));

  it('should navigate to /login if not authenticated on ngOnInit', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    spyOn(console, 'log');
    component.ngOnInit();
    tick();
    expect(mockAuthFacade.initialize).toHaveBeenCalled();
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('User is not logged in.');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should handle error if initialize rejects in ngOnInit', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.reject('init error'));
    spyOn(console, 'log');
    spyOn(console, 'error');
    component.ngOnInit();
    tick();
    expect(console.error).toHaveBeenCalledWith('Initialization failed:', 'init error');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should call authFacade.login on onLogin', () => {
    spyOn(console, 'log');
    component.onLogin();
    expect(console.log).toHaveBeenCalledWith('Logging in...');
    expect(mockAuthFacade.login).toHaveBeenCalled();
  });
});