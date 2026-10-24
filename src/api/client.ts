import { env } from '../config/env';
import { ApiResponse } from '../types';
import { AppError } from '../utils/errors';

/**
 * Abstract API Base Client
 * Prevents UI components from interacting directly with data sources or raw fetches
 */
export class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Simulates async API network call delay when mock mode is active
   */
  public async simulateNetwork<T>(data: T, delayMs = 300): Promise<ApiResponse<T>> {
    if (env.enableMockApi) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats error into standardized ApiResponse exception
   */
  public handleError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    return new AppError((error as Error)?.message || 'API request failed', 'API_FAILURE', 500);
  }
}

export const apiClient = ApiClient.getInstance();
