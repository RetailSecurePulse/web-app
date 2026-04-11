import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthFacade } from '../services/auth.facade';
import { authInterceptor } from './auth.interceptor';
import { ConfigService } from '../services/config.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAuthFacade: jasmine.SpyObj<AuthFacade>;
  let mockConfigService: Pick<ConfigService, 'apiConfig'>;

  beforeEach(() => {
    mockAuthFacade = jasmine.createSpyObj<AuthFacade>('AuthFacade', ['getAuthorizationToken']);
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fake-token'));
    mockConfigService = {
      apiConfig: {
        user_api_url: 'http://localhost:30082/',
        business_entity_api_url: 'http://localhost:30083/',
        inventory_api_url: 'http://localhost:30084/',
        sales_api_url: 'http://localhost:30085/',
        report_api_url: 'http://localhost:30086/',
        payments_api_url: 'http://localhost:30087/'
      }
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthFacade,
          useValue: mockAuthFacade
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should skip adding token for excluded auth URLs', fakeAsync(() => {
    const excludedUrls = [
      'http://localhost:8081/auth/.well-known/openid-configuration',
      'http://localhost:8081/auth/oauth2/jwks',
      'http://localhost:8081/auth/oauth2/token',
      'http://localhost:8081/auth/login'
    ];

    excludedUrls.forEach(url => {
      mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fake-token'));

      httpClient.get(url).subscribe(res => expect(res).toBeTruthy());

      const req = httpTestingController.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  }));

  it('should skip adding token for OPTIONS method', () => {
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fake-token'));

    httpClient.options('/api/data').subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('/api/data');
    expect(req.request.method).toBe('OPTIONS');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not add token to non-API URLs', () => {
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fake-token'));

    httpClient.get('http://example.com/public').subscribe(res => expect(res).toBeTruthy());

    const req = httpTestingController.expectOne('http://example.com/public');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
  
  it('should not modify request when token is undefined', fakeAsync(() => {
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve(undefined as any));

    httpClient.get('http://localhost:30082/api/data').subscribe(res => expect(res).toBeTruthy());
    flushMicrotasks();

    const req = httpTestingController.expectOne('http://localhost:30082/api/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  }));

  it('should not interfere with other interceptors or headers', fakeAsync(() => {
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fake-token'));

    httpClient.get('http://localhost:30082/api/data', {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(res => expect(res).toBeTruthy());
    flushMicrotasks();

    const req = httpTestingController.expectOne('http://localhost:30082/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({});
  }));

  it('should throw error if request is not handled', fakeAsync(() => {
    httpClient.get('http://localhost:30082/api/data').subscribe({
      next: () => fail('Should not reach here'),
      error: err => expect(err).toBeTruthy()
    });
    flushMicrotasks();

    const req = httpTestingController.expectOne('http://localhost:30082/api/data');
    req.error(new ErrorEvent('Network error'));
  }));

  it('should await a refreshed token before forwarding protected requests', fakeAsync(() => {
    mockAuthFacade.getAuthorizationToken.and.returnValue(Promise.resolve('fresh-token'));

    httpClient.get('http://localhost:30084/api/products').subscribe(res => expect(res).toBeTruthy());
    flushMicrotasks();

    const req = httpTestingController.expectOne('http://localhost:30084/api/products');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    req.flush({});
  }));
});
