import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function normalizeBaseUrl(url: string): string {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) {
    return clean;
  }
  return `${clean}/api/v1`;
}

export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('pr_access_token');
    }

    // Request interceptor: Attach Access JWT if available
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor: Automatic 1-time token refresh retry
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;

          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('pr_refresh_token') : null;
              const { data } = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                { withCredentials: true },
              );

              this.setTokens(data.accessToken, data.refreshToken);
              this.isRefreshing = false;
              this.onRefreshed(data.accessToken);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
              }
              return this.client(originalRequest);
            } catch (refreshErr) {
              this.isRefreshing = false;
              this.clearTokens();
              return Promise.reject(refreshErr);
            }
          }

          return new Promise((resolve) => {
            this.subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(this.client(originalRequest));
            });
          });
        }

        return Promise.reject(error);
      },
    );
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pr_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('pr_refresh_token', refreshToken);
      }
    }
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pr_access_token');
      localStorage.removeItem('pr_refresh_token');
    }
  }

  getTokens() {
    return {
      accessToken: this.accessToken,
    };
  }

  // API Methods
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const res = await this.client.get<T>(url, { params });
    return res.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const res = await this.client.post<T>(url, data);
    return res.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const res = await this.client.patch<T>(url, data);
    return res.data;
  }

  async delete<T>(url: string): Promise<T> {
    const res = await this.client.delete<T>(url);
    return res.data;
  }
}

export const api = new ApiClient();
