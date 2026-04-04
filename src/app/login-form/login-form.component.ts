import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { AuthFacade } from '../services/auth.facade';
import {
  LoginFlowResponse,
  LoginFlowService,
  LoginFlowStatus
} from '../services/login-flow.service';

type LoginStep = 'PASSWORD' | 'VERIFY';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, MessageModule]
})
export class LoginFormComponent implements OnInit {
  private readonly authFacade = inject(AuthFacade);
  private readonly loginFlowService = inject(LoginFlowService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  protected readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{6}$/)]]
  });

  protected step: LoginStep = 'PASSWORD';
  protected loading = false;
  protected errorMessage = '';
  protected infoMessage = '';
  protected maskedEmail = '';
  protected displayName = '';
  protected deviceLabel = '';
  protected verificationCodePrefix = '';
  protected loginTransactionId = '';
  protected resendAvailableAt?: string;
  protected retryAfterSeconds?: number;

  async ngOnInit(): Promise<void> {
    try {
      await this.authFacade.initialize();
      if (this.authFacade.isAuthenticated()) {
        this.authFacade.navigateToAuthenticatedUser();
        return;
      }

      const status = await firstValueFrom(this.loginFlowService.getStatus());
      await this.applyFlowResponse(status);
    } catch {
      this.errorMessage = 'Unable to initialize login. Please try again.';
      this.refreshView();
    }
  }

  protected async onStartLogin(): Promise<void> {
    if (this.loginForm.invalid || this.loading) {
      this.resetMessages();
      if (this.loginForm.invalid) {
        this.errorMessage = 'Enter both username and password to continue.';
      }
      this.loginForm.markAllAsTouched();
      this.refreshView();
      return;
    }

    this.loading = true;
    this.resetMessages();
    try {
      const response = await firstValueFrom(this.loginFlowService.start(this.loginForm.getRawValue()));
      await this.applyFlowResponse(response);
    } catch (error: unknown) {
      this.handleFlowError(error, 'Unable to start login. Please try again.');
    } finally {
      this.loading = false;
      this.refreshView();
    }
  }

  protected async onVerifyLogin(): Promise<void> {
    if (this.verifyForm.invalid || this.loading || !this.loginTransactionId) {
      this.resetMessages();
      if (this.verifyForm.invalid) {
        this.errorMessage = this.verificationCodeValidationMessage();
      } else if (!this.loginTransactionId) {
        this.errorMessage = 'Your verification session has expired. Please sign in again.';
      }
      this.verifyForm.markAllAsTouched();
      this.refreshView();
      return;
    }

    this.loading = true;
    this.resetMessages();
    try {
      const verificationCodeSuffix = this.verifyForm.getRawValue().code.trim().toUpperCase();
      const response = await firstValueFrom(this.loginFlowService.verify({
        loginTransactionId: this.loginTransactionId,
        code: `${this.verificationCodePrefix}${verificationCodeSuffix}`
      }));
      await this.applyFlowResponse(response);
    } catch (error: unknown) {
      this.handleFlowError(error, 'Unable to verify login. Please try again.');
    } finally {
      this.loading = false;
      this.refreshView();
    }
  }

  protected async onResendCode(): Promise<void> {
    if (this.loading || !this.loginTransactionId) {
      return;
    }

    this.loading = true;
    this.resetMessages();
    try {
      const response = await firstValueFrom(this.loginFlowService.resend({
        loginTransactionId: this.loginTransactionId
      }));
      await this.applyFlowResponse(response);
    } catch (error: unknown) {
      this.handleFlowError(error, 'Unable to resend the verification code. Please try again.');
    } finally {
      this.loading = false;
      this.refreshView();
    }
  }

  protected get resendHint(): string {
    if (this.retryAfterSeconds && this.retryAfterSeconds > 0) {
      return `You can resend a new code in about ${this.retryAfterSeconds} seconds.`;
    }

    if (!this.resendAvailableAt) {
      return '';
    }

    return `Resend is available after ${new Date(this.resendAvailableAt).toLocaleTimeString()}.`;
  }

  protected get isVerifyStep(): boolean {
    return this.step === 'VERIFY';
  }

  protected get verificationCodeHint(): string {
    return this.verificationCodePrefix || 'CODE-';
  }

  private async applyFlowResponse(response: LoginFlowResponse): Promise<void> {
    this.captureUiState(response);

    switch (response.status) {
      case 'NONE':
        this.step = 'PASSWORD';
        this.infoMessage = '';
        break;
      case 'VERIFICATION_REQUIRED':
      case 'RESENT':
      case 'COOLDOWN':
        this.step = 'VERIFY';
        this.infoMessage = response.message;
        break;
      case 'VERIFIED':
        this.infoMessage = response.message;
        this.authFacade.login();
        break;
      case 'INVALID_CREDENTIALS':
        this.step = 'PASSWORD';
        this.errorMessage = response.message;
        break;
      case 'INVALID_CODE':
        this.step = 'VERIFY';
        this.errorMessage = response.message;
        break;
      case 'EXPIRED':
      case 'SESSION_EXPIRED':
      case 'RESEND_LIMIT_REACHED':
        this.clearVerifyState();
        this.step = 'PASSWORD';
        this.errorMessage = response.message;
        break;
      default:
        this.errorMessage = response.message || 'Unexpected login status.';
    }

    this.refreshView();
  }

  private handleFlowError(error: unknown, fallbackMessage: string): void {
    const apiMessage = this.extractErrorMessage(error);
    const apiResponse = this.extractErrorResponse(error);

    if (apiResponse) {
      this.captureUiState(apiResponse);
      const status = apiResponse.status as LoginFlowStatus | undefined;
      if (status === 'INVALID_CODE' || status === 'COOLDOWN') {
        this.step = 'VERIFY';
      } else if (status === 'EXPIRED' || status === 'SESSION_EXPIRED' || status === 'RESEND_LIMIT_REACHED') {
        this.clearVerifyState();
        this.step = 'PASSWORD';
      }
    }

    this.errorMessage = apiMessage ?? fallbackMessage;
    this.refreshView();
  }

  private extractErrorResponse(error: unknown): LoginFlowResponse | null {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: unknown }).error;
      if (payload && typeof payload === 'object' && 'status' in payload) {
        return payload as LoginFlowResponse;
      }
    }

    return null;
  }

  private extractErrorMessage(error: unknown): string | null {
    const response = this.extractErrorResponse(error);
    if (response?.message) {
      return response.message;
    }

    return null;
  }

  private captureUiState(response: LoginFlowResponse): void {
    this.loginTransactionId = response.loginTransactionId ?? this.loginTransactionId;
    this.verificationCodePrefix = response.verificationCodePrefix ?? this.verificationCodePrefix;
    this.maskedEmail = response.maskedEmail ?? this.maskedEmail;
    this.displayName = response.displayName ?? this.displayName;
    this.deviceLabel = response.deviceLabel ?? this.deviceLabel;
    this.resendAvailableAt = response.resendAvailableAt ?? this.resendAvailableAt;
    this.retryAfterSeconds = response.retryAfterSeconds;
  }

  private clearVerifyState(): void {
    this.loginTransactionId = '';
    this.verificationCodePrefix = '';
    this.maskedEmail = '';
    this.displayName = '';
    this.deviceLabel = '';
    this.resendAvailableAt = undefined;
    this.retryAfterSeconds = undefined;
    this.verifyForm.reset();
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.infoMessage = '';
  }

  private verificationCodeValidationMessage(): string {
    if (this.verificationCodePrefix) {
      return `Enter the 6-character code after ${this.verificationCodePrefix}`;
    }

    return 'Enter the 6-character verification code from your email.';
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }
}
