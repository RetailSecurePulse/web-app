import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { createMockAuthService } from '../mock/auth.service.mock';
import { ConfirmationService } from 'primeng/api';

import { LoginPageComponent } from './login-page.component';
import { AuthFacade } from '../services/auth.facade';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let mockAuthService: jasmine.SpyObj<AuthFacade>;

  beforeEach(async () => {
     // Mock OauthAuthenticationService
    mockAuthService = createMockAuthService();

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthFacade, useValue: mockAuthService }, // Mock OauthAuthenticationService
        ConfirmationService,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start IAM sign-in when the primary button is clicked', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.primary-button');

    button.click();

    expect(mockAuthService.login).toHaveBeenCalled();
  });
});
