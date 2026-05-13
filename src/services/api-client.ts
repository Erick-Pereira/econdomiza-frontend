import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
}

export interface RequestInterceptorConfig {
  onRequest: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
}

export interface ResponseInterceptorConfig {
  onResponse: (response: AxiosResponse) => AxiosResponse | void;
  onError: (error: AxiosError) => AxiosError | void;
}

export type RequestConfig = {
  params?: Record<string, unknown>;
  data?: unknown;
  method?: string;
};

export class HttpClient {
  private client: AxiosInstance;
  private requestInterceptors: RequestInterceptorConfig[];
  private responseInterceptors: ResponseInterceptorConfig[];

  constructor(
    config: ApiClientConfig = {},
    requestInterceptors: RequestInterceptorConfig[] = [],
    responseInterceptors: ResponseInterceptorConfig[] = []
  ) {
    const { baseUrl = '', timeout = 30000, headers = {} } = config;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    this.requestInterceptors = requestInterceptors;
    this.responseInterceptors = responseInterceptors;
  }

  public configRequest = (interceptorConfig: RequestInterceptorConfig) => {
    this.requestInterceptors.push(interceptorConfig);
  };

  public configResponse = (interceptorConfig: ResponseInterceptorConfig) => {
    this.responseInterceptors.push(interceptorConfig);
  };

  public withAuthInterceptor() {
    this.configRequest({
      onRequest: async (config) => {
        const token = localStorage.getItem('econdomiza_tokens');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
    });
  }

  public withErrorInterceptor() {
    this.configResponse({
      onResponse: (response) => {
        // Retornar resposta de erro como data null para facilitar tratamento
        if (response.status >= 400) {
          // Mantém a resposta para que o interceptor de erro possa tratar
        }
        return response;
      },
      onError: (error: AxiosError) => {
        // Se for erro de rede ou timeout, rethrow
        if (!error.response) {
          throw error;
        }

        // Retornar a resposta original para que o consumer possa decidir o que fazer
        return error;
      },
    });
  }

  public async request<T = unknown>(path: string, config?: RequestConfig): Promise<T> {
    const method = (config?.method ?? 'GET').toUpperCase();
    const response = await this.client.request<T>({
      url: path,
      method,
      params: config?.params,
      data: config?.data,
    });

    return response.data as T;
  }

  public async get<T = unknown>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  public async post<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      data,
    });
  }

  public async put<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      data,
    });
  }

  public async delete<T = unknown>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  public async patch<T = unknown>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      data,
    });
  }
}

export const defaultHttpClient = new HttpClient();
