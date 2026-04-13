const isProd = process.env.NODE_ENV === 'production';
const API_URL = process.env.NEXT_PUBLIC_API_URL || (isProd ? '/api' : 'http://localhost:4000/api');

// 🔥 Función para obtener session_token del sessionStorage
const getSessionToken = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('session_token');
  }
  return null;
};

export const api = {
  async get(endpoint: string, token?: string | null) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const sessionToken = getSessionToken();
    
    try {
      const headers: HeadersInit = {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      };
      
      // 🔥 Agregar session_token si existe
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }
      
      const res = await fetch(`${API_URL}${cleanEndpoint}`, {
        headers,
      });
      
      // 🔥 Si es 401 (no autorizado), limpiar sesión local
      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('session_token');
        sessionStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: 'Sesión expirada. Inicie sesión nuevamente.' };
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      return { error: `Server error (${res.status}): ${text.substring(0, 100)}` };
    } catch (err: any) {
      console.error('API GET Error:', err);
      return { error: 'Error de conexión con el servidor.' };
    }
  },

  async post(endpoint: string, data: any, token?: string) {
    const sessionToken = getSessionToken();
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };
      
      // 🔥 Agregar session_token si existe
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      // 🔥 Si es 401 (no autorizado), limpiar sesión local
      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('session_token');
        sessionStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: 'Sesión expirada. Inicie sesión nuevamente.' };
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      return { error: `Server error (${res.status}): ${text.substring(0, 100)}` };
    } catch (err: any) {
      console.error('API POST Error:', err);
      return { error: 'Error de conexión con el servidor.' };
    }
  },

  async put(endpoint: string, data: any, token?: string) {
    const sessionToken = getSessionToken();
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };
      
      // 🔥 Agregar session_token si existe
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      
      // 🔥 Si es 401 (no autorizado), limpiar sesión local
      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('session_token');
        sessionStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: 'Sesión expirada. Inicie sesión nuevamente.' };
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      return { error: `Server error (${res.status}): ${text.substring(0, 100)}` };
    } catch (err: any) {
      console.error('API PUT Error:', err);
      return { error: 'Error de conexión con el servidor.' };
    }
  },

  async delete(endpoint: string, token?: string) {
    const sessionToken = getSessionToken();
    
    try {
      const headers: HeadersInit = {
        'Authorization': token ? `Bearer ${token}` : '',
      };
      
      // 🔥 Agregar session_token si existe
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
      });
      
      // 🔥 Si es 401 (no autorizado), limpiar sesión local
      if (res.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('session_token');
        sessionStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: 'Sesión expirada. Inicie sesión nuevamente.' };
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      return { error: `Server error (${res.status}): ${text.substring(0, 100)}` };
    } catch (err: any) {
      console.error('API DELETE Error:', err);
      return { error: 'Error de conexión con el servidor.' };
    }
  }
};