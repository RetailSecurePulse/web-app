import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { LogoutButtonComponent } from './logout-button.component';
import { AuthFacade } from '../services/auth.facade';

describe('LogoutButtonComponent', () => {
  let component: LogoutButtonComponent;
  let fixture: ComponentFixture<LogoutButtonComponent>;
  let mockAuthService: jasmine.SpyObj<AuthFacade>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthFacade', ['isAuthenticated', 'logout']);

    await TestBed.configureTestingModule({
      imports: [LogoutButtonComponent],
      providers: [
        provideHttpClient(),
        { provide: AuthFacade, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LogoutButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should logout if authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    component.onLogout();
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should do nothing if not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    component.onLogout();
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });
});
