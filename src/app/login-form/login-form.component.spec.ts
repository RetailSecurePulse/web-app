import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService } from 'primeng/api';

import { LoginFormComponent } from './login-form.component';
import { AuthFacade } from '../services/auth.facade';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;

  beforeEach(async () => {
    mockAuthFacade = jasmine.createSpyObj('AuthFacade', [
      'initialize',
      'isAuthenticated',
      'navigateToAuthenticatedUser',
      'login'
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthFacade, useValue: mockAuthFacade },
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
    component.ngOnInit();
    tick();
    expect(mockAuthFacade.initialize).toHaveBeenCalled();
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthFacade.navigateToAuthenticatedUser).toHaveBeenCalled();
  }));

  it('should stay on the login screen if not authenticated on ngOnInit', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    component.ngOnInit();
    tick();
    expect(mockAuthFacade.initialize).toHaveBeenCalled();
    expect(mockAuthFacade.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthFacade.navigateToAuthenticatedUser).not.toHaveBeenCalled();
  }));

  it('should handle error if initialize rejects in ngOnInit', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.reject('init error'));
    spyOn(console, 'error');
    component.ngOnInit();
    tick();
    expect(console.error).toHaveBeenCalledWith('Initialization failed:', 'init error');
  }));

  it('should call authFacade.login on onLogin', () => {
    component.onLogin();
    expect(mockAuthFacade.login).toHaveBeenCalled();
  });
});
