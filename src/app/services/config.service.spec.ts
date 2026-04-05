import { ConfigService } from './config.service';
import { environment } from '../../environments/environment';

type RuntimeConfigHost = typeof globalThis & {
  runtimeConfig?: any;
};

describe('ConfigService', () => {
  let originalRuntimeConfig: RuntimeConfigHost['runtimeConfig'];
  let originalUseRuntimeConfig: boolean;

  beforeEach(() => {
    originalRuntimeConfig = (globalThis as RuntimeConfigHost).runtimeConfig;
    originalUseRuntimeConfig = environment.useRuntimeConfig;
  });

  afterEach(() => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = originalUseRuntimeConfig;

    if (originalRuntimeConfig === undefined) {
      delete (globalThis as RuntimeConfigHost).runtimeConfig;
      return;
    }

    (globalThis as RuntimeConfigHost).runtimeConfig = originalRuntimeConfig;
  });

  it('should apply runtime environment overrides for local auth bypass settings', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {} as any,
      apiConfig: {} as any,
      environment: {
        production: true,
        authEnabled: false,
        devModeUser: 'localdev',
        devModeRole: 'operator',
        defaultPassword: 'runtime-password',
        stripePublicKey: 'pk_runtime'
      }
    };

    const service = new ConfigService();

    expect(service.environment.production).toBe(environment.production);
    expect(service.environment.authEnabled).toBeFalse();
    expect(service.environment.devModeUser).toBe('localdev');
    expect(service.environment.devModeRole).toBe('operator');
    expect(service.environment.defaultPassword).toBe('runtime-password');
    expect(service.environment.stripePublicKey).toBe('pk_runtime');
  });

  it('should fall back to environment values when runtime environment overrides are absent', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {} as any,
      apiConfig: {} as any,
      environment: undefined as any
    };

    const service = new ConfigService();

    expect(service.environment).toEqual({
      production: environment.production,
      authEnabled: environment.authEnabled,
      devModeUser: environment.devModeUser,
      devModeRole: environment.devModeRole,
      defaultPassword: environment.defaultPassword,
      stripePublicKey: environment.stripePublicKey
    });
  });

  it('should reject production runtime config that enables OAuth debug logging', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {
        showDebugInformation: true
      } as any,
      apiConfig: {
        user_api_url: 'https://retailpulse.me:8082/',
        business_entity_api_url: 'https://retailpulse.me:8083/',
        inventory_api_url: 'https://retailpulse.me:8084/',
        sales_api_url: 'https://retailpulse.me:8085/',
        report_api_url: 'https://retailpulse.me:8086/',
        payments_api_url: 'https://retailpulse.me:8087/'
      } as any,
      environment: undefined as any
    };

    const originalProduction = environment.production;
    (environment as { production: boolean }).production = true;

    try {
      expect(() => new ConfigService()).toThrowError(
        'Insecure production configuration: OAuth debug logging must be disabled.'
      );
    } finally {
      (environment as { production: boolean }).production = originalProduction;
    }
  });

  it('should normalize runtime redirectUri placeholders to the current origin callback route', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {
        redirectUri: 'window.location.origin'
      } as any,
      apiConfig: {} as any,
      environment: undefined as any
    };

    const service = new ConfigService();

    expect(service.authConfig.redirectUri).toBe(`${globalThis.location.origin}/auth/callback`);
  });

  it('should normalize runtime postLogoutRedirectUri placeholders to the current origin', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {
        postLogoutRedirectUri: 'window.location.origin'
      } as any,
      apiConfig: {} as any,
      environment: undefined as any
    };

    const service = new ConfigService();

    expect(service.authConfig.postLogoutRedirectUri).toBe(`${globalThis.location.origin}`);
  });

  it('should normalize a bare runtime origin redirectUri to the callback route', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = true;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {
        redirectUri: `${globalThis.location.origin}/`
      } as any,
      apiConfig: {} as any,
      environment: undefined as any
    };

    const service = new ConfigService();

    expect(service.authConfig.redirectUri).toBe(`${globalThis.location.origin}/auth/callback`);
  });

  it('should ignore runtime config when runtime overrides are disabled', () => {
    (environment as { useRuntimeConfig: boolean }).useRuntimeConfig = false;
    (globalThis as RuntimeConfigHost).runtimeConfig = {
      authConfig: {
        issuer: 'https://override.example.com'
      } as any,
      apiConfig: {
        user_api_url: 'https://override.example.com/api'
      } as any,
      environment: {
        authEnabled: false
      }
    };

    const service = new ConfigService();

    expect(service.authConfig.issuer).toBeDefined();
    expect(service.authConfig.issuer).not.toBe('https://override.example.com');
    expect(service.apiConfig.user_api_url).toBe(environment.production ? 'https://override.example.com/api' : 'http://localhost:30082/');
    expect(service.environment.authEnabled).toBe(environment.authEnabled);
  });
});
