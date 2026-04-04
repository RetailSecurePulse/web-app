import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export type LoginFlowStatus =
  | 'NONE'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'RESENT'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_CODE'
  | 'EXPIRED'
  | 'COOLDOWN'
  | 'RESEND_LIMIT_REACHED'
  | 'SESSION_EXPIRED';

export interface LoginFlowResponse {
  status: LoginFlowStatus;
  message: string;
  loginTransactionId?: string;
  verificationCodePrefix?: string;
  maskedEmail?: string;
  displayName?: string;
  deviceLabel?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  retryAfterSeconds?: number;
  csrfHeaderName?: string;
  csrfToken?: string;
}

export interface LoginStartRequest {
  username: string;
  password: string;
}

export interface LoginVerifyRequest {
  loginTransactionId: string;
  code: string;
}

export interface LoginResendRequest {
  loginTransactionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoginFlowService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private csrfHeaderName?: string;
  private csrfToken?: string;

  private get baseUrl(): string {
    // The issuer in config may be stored with or without a trailing slash, so
    // normalize it once before we build the headless login API URLs below.
    return (this.config.authConfig.issuer ?? '').replace(/\/+$/, '');
  }

  getStatus(): Observable<LoginFlowResponse> {
    return this.http.get<LoginFlowResponse>(this.endpoint('/api/auth/login/status'), {
      withCredentials: true
    }).pipe(
      tap(response => this.captureCsrf(response))
    );
  }

  start(payload: LoginStartRequest): Observable<LoginFlowResponse> {
    return this.postFlow('/api/auth/login/start', payload);
  }

  verify(payload: LoginVerifyRequest): Observable<LoginFlowResponse> {
    return this.postFlow('/api/auth/login/verify', payload);
  }

  resend(payload: LoginResendRequest): Observable<LoginFlowResponse> {
    return this.postFlow('/api/auth/login/resend', payload);
  }

  private postFlow<T extends LoginStartRequest | LoginVerifyRequest | LoginResendRequest>(
    path: string,
    payload: T
  ): Observable<LoginFlowResponse> {
    // These pre-token login endpoints still rely on the IAM session cookie, so
    // every request keeps withCredentials enabled and reuses the latest CSRF
    // token returned by the server.
    return this.http.post<LoginFlowResponse>(this.endpoint(path), payload, {
      headers: this.buildHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => this.captureCsrf(response))
    );
  }

  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.csrfHeaderName && this.csrfToken) {
      headers = headers.set(this.csrfHeaderName, this.csrfToken);
    }

    return headers;
  }

  private endpoint(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private captureCsrf(response: LoginFlowResponse): void {
    // IAM returns the next CSRF token in the JSON payload so the SPA can keep
    // posting to the headless login endpoints without falling back to HTML forms.
    if (response.csrfHeaderName && response.csrfToken) {
      this.csrfHeaderName = response.csrfHeaderName;
      this.csrfToken = response.csrfToken;
    }
  }
}
