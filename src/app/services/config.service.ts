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
        production: env.production,
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

    // Runtime config can only safely store placeholders for the SPA callback,
    // because the real browser origin is only known at runtime in the browser.
    if (redirectUri === 'window.location.origin' || redirectUri === 'globalThis.location.origin') {
      normalizedConfig.redirectUri = `${origin}/auth/callback`;
    } else if (redirectUri === '/auth/callback') {
      normalizedConfig.redirectUri = `${origin}/auth/callback`;
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
