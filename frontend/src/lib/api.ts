const isProd = process.env.NODE_ENV === 'production';
const API_URL = process.env.NEXT_PUBLIC_API_URL || (isProd ? '/api' : 'http://localhost:4000/api');

export const api = {
  async get(endpoint: string, token?: string | null) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    try {
      const res = await fetch(`${API_URL}${cleanEndpoint}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
      });
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
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      });
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
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      });
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
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
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