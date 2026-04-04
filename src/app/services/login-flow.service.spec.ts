import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { LoginFlowService } from './login-flow.service';
import { ConfigService } from './config.service';

describe('LoginFlowService', () => {
  let service: LoginFlowService;
  let httpTestingController: HttpTestingController;
  let configSpy: jasmine.SpyObj<ConfigService>;

  beforeEach(() => {
    configSpy = jasmine.createSpyObj<ConfigService>('ConfigService', [], {
      authConfig: {
        issuer: 'http://localhost:8081/auth/'
      }
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: configSpy }
      ]
    });

    service = TestBed.inject(LoginFlowService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should call status with credentials and store csrf token', () => {
    service.getStatus().subscribe(response => {
      expect(response.status).toBe('NONE');
    });

    const req = httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/status');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({
      status: 'NONE',
      message: '',
      csrfHeaderName: 'X-CSRF-TOKEN',
      csrfToken: 'csrf-123'
    });
  });

  it('should send cached csrf header on start request', () => {
    service.getStatus().subscribe();
    httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/status').flush({
      status: 'NONE',
      message: '',
      csrfHeaderName: 'X-CSRF-TOKEN',
      csrfToken: 'csrf-123'
    });

    service.start({ username: 'superadmin', password: 'password1' }).subscribe(response => {
      expect(response.status).toBe('VERIFICATION_REQUIRED');
    });

    const req = httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-123');
    req.flush({
      status: 'VERIFICATION_REQUIRED',
      message: 'Verification code sent.'
    });
  });

  it('should send verify requests with the cached csrf header', () => {
    service.getStatus().subscribe();
    httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/status').flush({
      status: 'VERIFICATION_REQUIRED',
      message: '',
      csrfHeaderName: 'X-CSRF-TOKEN',
      csrfToken: 'csrf-verify'
    });

    service.verify({ loginTransactionId: 'ltx-123', code: 'AJCK-ABC123' }).subscribe();

    const req = httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-verify');
    expect(req.request.body).toEqual({
      loginTransactionId: 'ltx-123',
      code: 'AJCK-ABC123'
    });
    req.flush({
      status: 'VERIFIED',
      message: 'Login verified.'
    });
  });

  it('should resend without a csrf header before one has been issued', () => {
    service.resend({ loginTransactionId: 'ltx-123' }).subscribe();

    const req = httpTestingController.expectOne('http://localhost:8081/auth/api/auth/login/resend');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('X-CSRF-TOKEN')).toBeFalse();
    req.flush({
      status: 'RESENT',
      message: 'Verification code resent.'
    });
  });
});
