import axios from 'axios';

// Usa NEXT_PUBLIC_API_URL quando disponível (ex.: http://localhost:3001),
// senão mantém fallback para '/api' (útil quando há rewrite no Next).
const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});