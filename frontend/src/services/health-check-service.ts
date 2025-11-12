// Health check service for testing backend connectivity

import { httpClient } from './http-client';
import type { ApiError } from './types';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    api: {
      status: 'online' | 'offline';
      latency?: number;
      error?: string;
    };
    cache: {
      status: 'online' | 'offline';
      error?: string;
    };
    momentum: {
      status: 'online' | 'offline';
      error?: string;
    };
  };
  lastChecked: number;
  message?: string;
}

export class HealthCheckService {
  private readonly http: typeof httpClient;
  private lastHealthCheck: number = 0;
  private cachedStatus: HealthStatus | null = null;
  private readonly cacheTimeout: number = 30000; // 30 seconds

  constructor(httpClientInstance?: typeof httpClient) {
    this.http = httpClientInstance || httpClient;
  }

  /**
   * Check overall health status with caching
   */
  async checkHealth(forceRefresh: boolean = false): Promise<HealthStatus> {
    // Return cached result if still valid
    if (!forceRefresh && this.cachedStatus && this.isCacheValid()) {
      return this.cachedStatus;
    }

    this.lastHealthCheck = Date.now();

    // Test all services in parallel
    const [apiHealth, cacheHealth, momentumHealth] = await Promise.allSettled([
      this.checkApiHealth(),
      this.checkCacheHealth(),
      this.checkMomentumHealth()
    ]);

    const status = this.determineOverallStatus(apiHealth, cacheHealth, momentumHealth);
    const health: HealthStatus = {
      status,
      timestamp: Date.now(),
      services: {
        api: this.extractHealthResult(apiHealth, 'api'),
        cache: this.extractHealthResult(cacheHealth, 'cache'),
        momentum: this.extractHealthResult(momentumHealth, 'momentum')
      },
      lastChecked: this.lastHealthCheck,
      message: this.generateStatusMessage(status)
    };

    this.cachedStatus = health;
    return health;
  }

  /**
   * Check if backend API is reachable
   */
  private async checkApiHealth(): Promise<{ status: 'online' | 'offline'; latency?: number; error?: string }> {
    const startTime = Date.now();

    try {
      // Try a simple endpoint that should always be available
      await this.http.get('/health');
      const latency = Date.now() - startTime;

      return {
        status: 'online',
        latency,
        error: undefined
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      // Try fallback endpoint
      try {
        await this.http.get('/');
        return {
          status: 'online',
          latency,
          error: 'Using fallback endpoint'
        };
      } catch (fallbackError) {
        return {
          status: 'offline',
          latency,
          error: (error as ApiError).message || 'API endpoint unavailable'
        };
      }
    }
  }

  /**
   * Check if cache service is available
   */
  private async checkCacheHealth(): Promise<{ status: 'online' | 'offline'; error?: string }> {
    try {
      // Try to get cache status
      const result = await this.http.get<{ size: number }>('/cache/status');
      return {
        status: 'online',
        error: result.size >= 0 ? undefined : 'Cache not initialized'
      };
    } catch (error) {
      return {
        status: 'offline',
        error: (error as ApiError).message || 'Cache service unavailable'
      };
    }
  }

  /**
   * Check if momentum service is available
   */
  private async checkMomentumHealth(): Promise<{ status: 'online' | 'offline'; error?: string }> {
    try {
      // Try optimization health endpoint
      const result = await this.http.get('/optimization/health');
      return {
        status: 'online',
        error: undefined
      };
    } catch (error) {
      return {
        status: 'offline',
        error: (error as ApiError).message || 'Momentum service unavailable'
      };
    }
  }

  /**
   * Extract health result from Promise settled result
   */
  private extractHealthResult(
    result: PromiseSettledResult<any>,
    serviceName: string
  ): { status: 'online' | 'offline'; latency?: number; error?: string } {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    return {
      status: 'offline',
      error: (result.reason as ApiError)?.message || `${serviceName} check failed`
    };
  }

  /**
   * Determine overall status from individual service checks
   */
  private determineOverallStatus(
    api: PromiseSettledResult<any>,
    cache: PromiseSettledResult<any>,
    momentum: PromiseSettledResult<any>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const apiOnline = api.status === 'fulfilled' && api.value.status === 'online';
    const cacheOnline = cache.status === 'fulfilled' && cache.value.status === 'online';
    const momentumOnline = momentum.status === 'fulfilled' && momentum.value.status === 'online';

    if (!apiOnline) {
      return 'unhealthy';
    }

    if (cacheOnline && momentumOnline) {
      return 'healthy';
    }

    return 'degraded';
  }

  /**
   * Generate status message
   */
  private generateStatusMessage(status: HealthStatus['status']): string {
    switch (status) {
      case 'healthy':
        return 'All services are operational';
      case 'degraded':
        return 'Some services are unavailable - using fallback mechanisms';
      case 'unhealthy':
        return 'Backend services are unavailable - operating in offline mode';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Check if cached health status is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastHealthCheck < this.cacheTimeout;
  }

  /**
   * Test if backend is reachable with a simple ping
   */
  async ping(timeoutMs: number = 5000): Promise<boolean> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Ping timeout')), timeoutMs);
    });

    try {
      const healthPromise = this.http.get('/health');
      await Promise.race([healthPromise, timeoutPromise]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if we should use fallback mode
   */
  shouldUseFallback(): Promise<boolean> {
    return this.checkHealth().then(health => {
      return health.status === 'unhealthy';
    });
  }
}

// Create a default instance for convenience
export const healthCheckService = new HealthCheckService();
