export interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  /** Optional non-owner runtime connection for the application (least privilege). */
  appDatabaseUrl: string | null;
  /** shared = RLS-protected platform database; dedicated = per-school database. */
  dataPlaneMode: 'shared' | 'dedicated';
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: number;
  jwtRefreshTtl: number;
  corsOrigin: string;
  trustProxy: boolean;
  biometricProvider: string;
  storageProvider: string;
  emailProvider: string;
  cookieDomain: string | null;
  logLevel: string;
  inviteCode: string | null;
}

const DEV_ONLY_DEFAULTS = {
  databaseUrl: 'postgres://nexora:Nexora%402024%21@localhost:5433/nexora',
  jwtSecret: 'dev_access_secret_change_me_00000000000000000000000000000000',
  jwtRefreshSecret: 'dev_refresh_secret_change_me_0000000000000000000000000000',
};

export const KNOWN_DEV_SECRETS = [DEV_ONLY_DEFAULTS.jwtSecret, DEV_ONLY_DEFAULTS.jwtRefreshSecret];

/**
 * Loads + validates configuration. In production, required secrets MUST be
 * present, MUST NOT be the known dev defaults, and provider choices must be
 * explicit — otherwise the process fails fast with a clear error.
 */
export function loadConfiguration(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const required = (key: string, devFallback: string): string => {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value;
    if (isProd) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return devFallback;
  };

  const jwtSecret = required('JWT_SECRET', DEV_ONLY_DEFAULTS.jwtSecret);
  const jwtRefreshSecret = required('JWT_REFRESH_SECRET', DEV_ONLY_DEFAULTS.jwtRefreshSecret);

  if (isProd) {
    if (KNOWN_DEV_SECRETS.includes(jwtSecret) || KNOWN_DEV_SECRETS.includes(jwtRefreshSecret)) {
      throw new Error(
        'Refusing to start in production: JWT secrets match known development defaults. Generate strong random secrets.',
      );
    }
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin || corsOrigin.trim().length === 0) {
      throw new Error('Missing required environment variable: CORS_ORIGIN (production requires an explicit origin).');
    }
    const dataPlaneMode = process.env.DATA_PLANE_MODE ?? 'shared';
    if (dataPlaneMode !== 'shared' && dataPlaneMode !== 'dedicated') {
      throw new Error('DATA_PLANE_MODE must be \'shared\' or \'dedicated\' (production).');
    }
    // In production the application must NEVER run as the migration/owner role:
    // the runtime connection (APP_DATABASE_URL, non-owner login role) is required.
    if (!process.env.APP_DATABASE_URL || process.env.APP_DATABASE_URL.trim().length === 0) {
      throw new Error(
        'Missing required environment variable: APP_DATABASE_URL (production requires a non-owner runtime role connection).',
      );
    }
    const biometricProvider = process.env.BIOMETRIC_PROVIDER;
    if (!biometricProvider || biometricProvider.trim().length === 0) {
      throw new Error('Missing required environment variable: BIOMETRIC_PROVIDER (production requires an explicit provider).');
    }
  }

  return {
    nodeEnv,
    port: parseInt(process.env.API_PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    databaseUrl: required('DATABASE_URL', DEV_ONLY_DEFAULTS.databaseUrl),
    appDatabaseUrl: process.env.APP_DATABASE_URL ?? null,
    dataPlaneMode: (process.env.DATA_PLANE_MODE ?? 'shared') as 'shared' | 'dedicated',
    jwtSecret,
    jwtRefreshSecret,
    jwtAccessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    jwtRefreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    trustProxy: (process.env.TRUST_PROXY ?? 'false') === 'true',
    biometricProvider: process.env.BIOMETRIC_PROVIDER ?? 'dev',
    storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
    emailProvider: process.env.EMAIL_PROVIDER ?? 'console',
    cookieDomain: process.env.COOKIE_DOMAIN ?? null,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    inviteCode: process.env.INVITE_CODE ?? null,
  };
}