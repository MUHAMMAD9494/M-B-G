export interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: number;
  jwtRefreshTtl: number;
  corsOrigin: string;
  trustProxy: boolean;
}

const DEV_ONLY_DEFAULTS = {
  databaseUrl: 'postgres://nexora:Nexora%402024%21@localhost:5433/nexora',
  jwtSecret: 'dev_access_secret_change_me_00000000000000000000000000000000',
  jwtRefreshSecret: 'dev_refresh_secret_change_me_0000000000000000000000000000',
};

/**
 * Loads + validates configuration. In production, required secrets MUST be
 * present or the process fails fast with a clear error (no silent defaults).
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

  return {
    nodeEnv,
    port: parseInt(process.env.API_PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    databaseUrl: required('DATABASE_URL', DEV_ONLY_DEFAULTS.databaseUrl),
    jwtSecret: required('JWT_SECRET', DEV_ONLY_DEFAULTS.jwtSecret),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET', DEV_ONLY_DEFAULTS.jwtRefreshSecret),
    jwtAccessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    jwtRefreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    trustProxy: (process.env.TRUST_PROXY ?? 'false') === 'true',
  };
}
