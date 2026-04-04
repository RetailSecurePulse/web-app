import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { LoginFormComponent } from './login-form.component';
import { AuthFacade } from '../services/auth.facade';
import { LoginFlowService } from '../services/login-flow.service';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;
  let mockLoginFlowService: jasmine.SpyObj<LoginFlowService>;

  beforeEach(async () => {
    mockAuthFacade = jasmine.createSpyObj('AuthFacade', [
      'initialize',
      'isAuthenticated',
      'navigateToAuthenticatedUser',
      'login'
    ]);

    mockLoginFlowService = jasmine.createSpyObj('LoginFlowService', [
      'getStatus',
      'start',
      'verify',
      'resend'
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthFacade, useValue: mockAuthFacade },
        { provide: LoginFlowService, useValue: mockLoginFlowService }
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
    expect(mockLoginFlowService.getStatus).not.toHaveBeenCalled();
  }));

  it('should load password step when no pending login exists', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'NONE',
      message: 'No pending login verification.'
    }));

    component.ngOnInit();
    tick();

    expect(mockLoginFlowService.getStatus).toHaveBeenCalled();
    expect(component['step']).toBe('PASSWORD');
    expect(component['infoMessage']).toBe('');
  }));

  it('should load verification step when IAM already has pending login state', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'VERIFICATION_REQUIRED',
      message: 'Verification code required.',
      loginTransactionId: 'ltx-123',
      verificationCodePrefix: 'AJCK-',
      maskedEmail: 'ke***@rpulse.com',
      displayName: 'Kent Clark',
      deviceLabel: 'Chrome on macOS'
    }));

    component.ngOnInit();
    tick();

    expect(component['step']).toBe('VERIFY');
    expect(component['loginTransactionId']).toBe('ltx-123');
    expect(component['verificationCodePrefix']).toBe('AJCK-');
    expect(component['maskedEmail']).toBe('ke***@rpulse.com');
  }));

  it('should call authFacade.login after verification succeeds', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'NONE',
      message: ''
    }));

    component.ngOnInit();
    tick();

    component['loginTransactionId'] = 'ltx-123';
    component['verificationCodePrefix'] = 'AJCK-';
    component['step'] = 'VERIFY';
    component['verifyForm'].setValue({ code: 'ABC123' });
    mockLoginFlowService.verify.and.returnValue(of({
      status: 'VERIFIED',
      message: 'Login verified.'
    }));

    component['onVerifyLogin']();
    tick();

    expect(mockLoginFlowService.verify).toHaveBeenCalledWith({
      loginTransactionId: 'ltx-123',
      code: 'AJCK-ABC123'
    });
    expect(mockAuthFacade.login).toHaveBeenCalled();
  }));

  it('should move to verification step after successful password submission', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'NONE',
      message: ''
    }));

    component.ngOnInit();
    tick();

    component['loginForm'].setValue({ username: 'superadmin', password: 'password1' });
    mockLoginFlowService.start.and.returnValue(of({
      status: 'VERIFICATION_REQUIRED',
      message: 'Verification code sent.',
      loginTransactionId: 'ltx-789',
      verificationCodePrefix: 'AJCK-',
      maskedEmail: 'ke***@rpulse.com'
    }));

    component['onStartLogin']();
    tick();

    expect(mockLoginFlowService.start).toHaveBeenCalledWith({
      username: 'superadmin',
      password: 'password1'
    });
    expect(component['step']).toBe('VERIFY');
    expect(component['loginTransactionId']).toBe('ltx-789');
    expect(component['verificationCodePrefix']).toBe('AJCK-');
  }));

  it('should surface API error messages from login start', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'NONE',
      message: ''
    }));

    component.ngOnInit();
    tick();

    component['loginForm'].setValue({ username: 'superadmin', password: 'wrong' });
    mockLoginFlowService.start.and.returnValue(throwError(() => ({
      error: {
        status: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.'
      }
    })));

    component['onStartLogin']();
    tick();

    expect(component['errorMessage']).toBe('Invalid username or password.');
    expect(component['step']).toBe('PASSWORD');
  }));

  it('should keep verify step and show API invalid-code message', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'VERIFICATION_REQUIRED',
      message: 'Verification code required.',
      loginTransactionId: 'ltx-123',
      verificationCodePrefix: 'AJCK-',
      maskedEmail: 'ke***@rpulse.com'
    }));

    component.ngOnInit();
    tick();

    component['verifyForm'].setValue({ code: 'WRONG1' });
    mockLoginFlowService.verify.and.returnValue(throwError(() => ({
      error: {
        status: 'INVALID_CODE',
        message: 'The verification code is invalid. Please try again or request a new code.',
        loginTransactionId: 'ltx-123',
        verificationCodePrefix: 'AJCK-',
        maskedEmail: 'ke***@rpulse.com'
      }
    })));

    component['onVerifyLogin']();
    tick();

    expect(component['step']).toBe('VERIFY');
    expect(component['errorMessage']).toBe('The verification code is invalid. Please try again or request a new code.');
    expect(component['loginTransactionId']).toBe('ltx-123');
    expect(component['verificationCodePrefix']).toBe('AJCK-');
  }));

  it('should show validation message when verification code is incomplete', fakeAsync(() => {
    mockAuthFacade.initialize.and.returnValue(Promise.resolve());
    mockAuthFacade.isAuthenticated.and.returnValue(false);
    mockLoginFlowService.getStatus.and.returnValue(of({
      status: 'VERIFICATION_REQUIRED',
      message: 'Verification code required.',
      loginTransactionId: 'ltx-123',
      verificationCodePrefix: 'AJCK-'
    }));

    component.ngOnInit();
    tick();

    component['verifyForm'].setValue({ code: '123' });
    component['onVerifyLogin']();
    tick();

    expect(mockLoginFlowService.verify).not.toHaveBeenCalled();
    expect(component['errorMessage']).toBe('Enter the 6-character code after AJCK-');
    expect(component['step']).toBe('VERIFY');
  }));
});
