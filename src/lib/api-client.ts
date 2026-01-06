/**
 * API Client
 * Cliente Axios com interceptors para autenticação e tratamento de erros
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { handleAPIError } from './api-errors'
import { APIResponse, RequestConfig } from './api-types'

/**
 * Classe do cliente API
 */
export class APIClient {
  private instance: AxiosInstance

  constructor() {
    // Configuração base do axios
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor - adiciona token de autenticação
    this.instance.interceptors.request.use(
      async (config) => {
        // TODO: Integrar com NextAuth.js para obter token real
        // Por enquanto, usa token mockado ou busca do sessionStorage
        const token = this.getToken()

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor - trata erros globalmente
    this.instance.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        // Se for 401, pode tentar refresh token ou redirecionar para login
        if (error.response?.status === 401) {
          // TODO: Implementar lógica de refresh token
          // Por enquanto, apenas limpa o token e pode redirecionar
          this.clearToken()

          // Se estiver no browser, redireciona para login
          if (typeof window !== 'undefined') {
            // Evita redirect loops
            if (!window.location.pathname.includes('/auth/login')) {
              window.location.href = '/auth/login'
            }
          }
        }

        // Passa erro para o handler central
        return Promise.reject(error)
      }
    )
  }

  /**
   * Obtém token de autenticação
   * TODO: Integrar com NextAuth.js session
   */
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('token') || localStorage.getItem('token')
    }
    return null
  }

  /**
   * Limpa token de autenticação
   */
  private clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
    }
  }

  /**
   * Define token de autenticação manualmente
   */
  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('token', token)
    }
  }

  /**
   * Método GET
   */
  async get<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.get(url, {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
      } as AxiosRequestConfig)

      return response.data
    } catch (error) {
      handleAPIError(error)
    }
  }

  /**
   * Método POST
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.post(url, data, {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
      } as AxiosRequestConfig)

      return response.data
    } catch (error) {
      handleAPIError(error)
    }
  }

  /**
   * Método PUT
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.put(url, data, {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
      } as AxiosRequestConfig)

      return response.data
    } catch (error) {
      handleAPIError(error)
    }
  }

  /**
   * Método PATCH
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.patch(url, data, {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
      } as AxiosRequestConfig)

      return response.data
    } catch (error) {
      handleAPIError(error)
    }
  }

  /**
   * Método DELETE
   */
  async delete<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.delete(url, {
        ...config,
        params: config?.params,
        headers: config?.headers,
        timeout: config?.timeout,
        signal: config?.signal,
      } as AxiosRequestConfig)

      return response.data
    } catch (error) {
      handleAPIError(error)
    }
  }

  /**
   * Obtém a instância do axios para casos especiais
   */
  public getInstance(): AxiosInstance {
    return this.instance
  }
}

/**
 * Instância singleton do cliente API
 */
export const apiClient = new APIClient()
