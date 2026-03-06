const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  skipErrorHandling?: boolean;
}

export async function api<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipErrorHandling = false, ...fetchOptions } = options;
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultOptions.headers,
      ...fetchOptions.headers,
    },
  });

  if (!response.ok && !skipErrorHandling) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export function get<T>(endpoint: string, options?: FetchOptions) {
  return api<T>(endpoint, { ...options, method: 'GET' });
}

export function post<T>(endpoint: string, data?: unknown, options?: FetchOptions) {
  return api<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function put<T>(endpoint: string, data?: unknown, options?: FetchOptions) {
  return api<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function del<T>(endpoint: string, options?: FetchOptions) {
  return api<T>(endpoint, { ...options, method: 'DELETE' });
}
