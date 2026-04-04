import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPageComponent } from './landing-page.component';
import { AuthFacade } from '../services/auth.facade';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let authFacadeSpy: jasmine.SpyObj<AuthFacade>;

  beforeEach(async () => {
    authFacadeSpy = jasmine.createSpyObj('AuthFacade', [
      'isAuthenticated',
      'navigateToAuthenticatedUser'
    ]);
    authFacadeSpy.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: authFacadeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the login link for anonymous users', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/login"]');

    expect(link).not.toBeNull();
    expect(link.textContent.trim()).toBe('Login');
  });

  it('should continue to the dashboard when an authenticated user clicks the secondary action', () => {
    authFacadeSpy.isAuthenticated.and.returnValue(true);
    fixture.detectChanges();

    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector('.secondary-button');
    expect(button).not.toBeNull();

    button?.click();

    expect(authFacadeSpy.navigateToAuthenticatedUser).toHaveBeenCalled();
  });
});
