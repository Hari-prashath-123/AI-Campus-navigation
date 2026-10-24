/**
 * Environment Configuration Parser & Validator
 */

export interface AppEnvConfig {
  appTitle: string;
  defaultLanguage: string;
  defaultCampusId: string;
  apiBaseUrl: string;
  enableMockApi: boolean;
  apiTimeoutMs: number;
  aiProvider: 'mock' | 'gemini' | 'openai' | 'ollama';
  aiModel: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const env: AppEnvConfig = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'OmniCampus Navigation',
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  defaultCampusId: import.meta.env.VITE_DEFAULT_CAMPUS_ID || 'campus-tech-inst',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.omnicampus.internal/v1',
  enableMockApi: parseBoolean(import.meta.env.VITE_ENABLE_MOCK_API, true),
  apiTimeoutMs: parseNumber(import.meta.env.VITE_API_TIMEOUT_MS, 5000),
  aiProvider: (import.meta.env.VITE_AI_PROVIDER as any) || 'mock',
  aiModel: import.meta.env.VITE_AI_MODEL || 'gemini-2.5-flash',
  isProduction: import.meta.env.PROD || false,
  isDevelopment: import.meta.env.DEV || true,
};
