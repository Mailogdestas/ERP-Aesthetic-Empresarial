import axios from 'axios';

const isDemo = true; // 👈 BYPASS DA DEMO (liga/desliga aqui)

// baseURL normal
const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    
    if (isDemo) {
      // 👇 força token fake na demo
      config.headers.Authorization = `Bearer demo-token`;
      return config;
    }

    // fluxo normal
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});