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

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: RuntimeConfig;

  constructor() {
    const useRuntime = env.useRuntimeConfig;
    const runtime = window.runtimeConfig;

    if (useRuntime && !runtime) {
      console.warn('Runtime config expected but not found. Falling back to environment.ts.');
    }

    this.config = {
      authConfig: { ...authConfig, ...(runtime?.authConfig || {}) },
      apiConfig: { ...apiConfig, ...(runtime?.apiConfig || {}) },
      environment: {
        production: env.production,
        authEnabled: env.authEnabled,
        devModeUser: env.devModeUser,
        devModeRole: env.devModeRole,
        stripePublicKey: runtime?.environment?.stripePublicKey || env.stripePublicKey
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

  private assertSecureProductionConfig(): void {
    if (!this.config.environment.production) {
      return;
    }

    if (this.config.authConfig.requireHttps === false) {
      throw new Error('Insecure production configuration: authConfig.requireHttps must not be false.');
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
