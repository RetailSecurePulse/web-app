import { Injectable } from '@angular/core';
import { AuthConfig } from 'angular-oauth2-oidc';
import { authConfig, apiConfig, environment as env } from '../../environments/environment';

interface ApiConfig {
  user_api_url: string;
  business_entity_api_url: string;
  inventory_api_url: string;
  sales_api_url: string;
  report_api_url: string;
  payments_api_url: string;
}

interface EnvironmentConfig {
  production: boolean;
  authEnabled: boolean;
  devModeUser: string;
  devModeRole: string;
  stripePublicKey: string;
}

interface RuntimeConfig {
  authConfig: AuthConfig;
  apiConfig: ApiConfig;
  environment: EnvironmentConfig;
}

type RuntimeConfigHost = typeof globalThis & {
  runtimeConfig?: RuntimeConfig;
};

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: RuntimeConfig;

  constructor() {
    const runtime = this.resolveRuntimeConfig();
    const runtimeEnvironment = runtime?.environment;

    this.config = {
      authConfig: this.normalizeAuthConfig({ ...authConfig, ...(runtime?.authConfig || {}) }),
      apiConfig: { ...apiConfig, ...(runtime?.apiConfig || {}) },
      environment: {
        production: runtimeEnvironment?.production ?? env.production,
        authEnabled: runtimeEnvironment?.authEnabled ?? env.authEnabled,
        devModeUser: runtimeEnvironment?.devModeUser ?? env.devModeUser,
        devModeRole: runtimeEnvironment?.devModeRole ?? env.devModeRole,
        stripePublicKey: runtimeEnvironment?.stripePublicKey ?? env.stripePublicKey
      }
    };

    this.assertSecureProductionConfig();
  }

  get authConfig(): AuthConfig {
    return this.config.authConfig;
  }

  get apiConfig(): ApiConfig {
    return this.config.apiConfig;
  }

  get environment(): EnvironmentConfig {
    return this.config.environment;
  }

  private resolveRuntimeConfig(): RuntimeConfig | undefined {
    // Local dev builds should keep their static environment values. This avoids
    // an accidental global runtimeConfig object silently overriding local auth
    // and API endpoints during ng serve or unit tests.
    if (!env.useRuntimeConfig) {
      return undefined;
    }

    return (globalThis as RuntimeConfigHost).runtimeConfig;
  }

  private normalizeAuthConfig(config: AuthConfig): AuthConfig {
    const normalizedConfig: AuthConfig = { ...config };
    const origin = globalThis.location?.origin ?? '';
    const redirectUri = normalizedConfig.redirectUri;
    const postLogoutRedirectUri = normalizedConfig.postLogoutRedirectUri;

    // Runtime config can only safely store placeholders for the SPA callback,
    // because the real browser origin is only known at runtime in the browser.
    if (redirectUri === 'window.location.origin' || redirectUri === 'globalThis.location.origin') {
      normalizedConfig.redirectUri = `${origin}/auth/callback`;
    } else if (redirectUri === '/auth/callback') {
      normalizedConfig.redirectUri = `${origin}/auth/callback`;
    } else if (typeof redirectUri === 'string' && origin) {
      const normalizedRedirectUri = redirectUri.endsWith('/') ? redirectUri.slice(0, -1) : redirectUri;
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      // Older runtime config may persist the bare SPA origin. Treat that as the
      // callback root so OAuth requests stay aligned with the registered client.
      if (normalizedRedirectUri === normalizedOrigin) {
        normalizedConfig.redirectUri = `${normalizedOrigin}/auth/callback`;
      }
    }

    if (postLogoutRedirectUri === 'window.location.origin' || postLogoutRedirectUri === 'globalThis.location.origin') {
      normalizedConfig.postLogoutRedirectUri = origin;
    } else if (postLogoutRedirectUri === '/') {
      normalizedConfig.postLogoutRedirectUri = origin;
    } else if (typeof postLogoutRedirectUri === 'string' && origin) {
      const normalizedPostLogoutRedirectUri = postLogoutRedirectUri.endsWith('/')
        ? postLogoutRedirectUri.slice(0, -1)
        : postLogoutRedirectUri;
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      if (normalizedPostLogoutRedirectUri === normalizedOrigin) {
        normalizedConfig.postLogoutRedirectUri = normalizedOrigin;
      }
    }

    return normalizedConfig;
  }

  private assertSecureProductionConfig(): void {
    // Production builds intentionally fail fast when auth or API endpoints are
    // still configured like local development. That keeps insecure runtime
    // overrides from being deployed quietly.
    if (!this.config.environment.production) {
      return;
    }

    if (this.config.authConfig.requireHttps === false) {
      throw new Error('Insecure production configuration: authConfig.requireHttps must not be false.');
    }

    if (this.config.authConfig.showDebugInformation === true) {
      throw new Error('Insecure production configuration: OAuth debug logging must be disabled.');
    }

    const issuer = this.config.authConfig.issuer ?? '';
    if (typeof issuer === 'string' && issuer.startsWith('http://')) {
      throw new Error('Insecure production configuration: auth issuer must use HTTPS.');
    }

    for (const [name, value] of Object.entries(this.config.apiConfig)) {
      if (value.startsWith('http://')) {
        throw new Error(`Insecure production configuration: ${name} must use HTTPS or a relative URL.`);
      }
    }
  }
}
