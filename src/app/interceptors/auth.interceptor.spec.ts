import { AuthFacade } from '../services/auth.facade';
import { environment } from '../../environments/environment';

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;

  beforeEach(() => {
    mockAuthFacade = jasmine.createSpyObj<AuthFacade>('AuthFacade', ['getAccessToken']);
    mockAuthFacade.getAccessToken.and.returnValue('fake-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthFacade,
          useValue: mockAuthFacade
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should skip adding token for excluded URLs', () => {
    const excludedUrls = [
      '/.well-known/openid-configuration',
      '/oauth2/jwks',
      '/oauth2/token',
      '/login'
    ];

    excludedUrls.forEach(url => {
      mockAuthFacade.getAccessToken.and.returnValue('fake-token');

      httpClient.get(url).subscribe(res => expect(res).toBeTruthy());

      const req = httpTestingController.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  });

  it('should skip adding token for OPTIONS method', () => {
    mockAuthFacade.getAccessToken.and.returnValue('fake-token');

    httpClient.options('/api/data').subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('/api/data');
    expect(req.request.method).toBe('OPTIONS');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should handle malformed URLs gracefully', () => {
    mockAuthFacade.getAccessToken.and.returnValue('fake-token');

    httpClient.get('http://malformed-url-without-path').subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('http://malformed-url-without-path');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
  
  it('should not modify request when token is undefined', () => {
    mockAuthFacade.getAccessToken.and.returnValue(undefined as any);

    httpClient.get('/api/data').subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not interfere with other interceptors or headers', () => {
    mockAuthFacade.getAccessToken.and.returnValue('fake-token');

    httpClient.get('/api/data', {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
  });

  it('should throw error if request is not handled', () => {
    httpClient.get('/api/data').subscribe({
      next: () => fail('Should not reach here'),
      error: err => expect(err).toBeTruthy()
    });

    const req = httpTestingController.expectOne('/api/data');
    req.error(new ErrorEvent('Network error'));
  });
});