import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/signup', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },
};

export const summariesAPI = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  checkDuplicate: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload-before-check', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getSummaries: async () => {
    const response = await api.get('/me/summaries');
    return response.data;
  },
  
  getSummary: async (id) => {
    const response = await api.get(`/summaries/${id}`);
    return response.data;
  },
  
  generateSummary: async (id, model) => {
    const response = await api.post(`/summaries/${id}/summarize`, { model });
    return response.data;
  },
  
  downloadFile: async (id) => {
    const response = await api.get(`/summaries/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  viewFile: async (id) => {
    const response = await api.post(`/summaries/${id}/view`, {}, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  deleteSummary: async (id) => {
    try {
      console.log('=== API DELETE REQUEST STARTED ===');
      console.log(`Making DELETE request to /summaries/${id}`);
      console.log(`Full URL: ${API_BASE_URL}/summaries/${id}`);
      console.log(`Request ID: ${id}`);
      console.log(`Request ID type: ${typeof id}`);
      
      const response = await api.delete(`/summaries/${id}`);
      console.log('✅ API DELETE SUCCESS');
      console.log('Delete response status:', response.status);
      console.log('Delete response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API DELETE FAILED');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error status:', error.response?.status);
      console.error('Error status text:', error.response?.statusText);
      console.error('Error data:', error.response?.data);
      console.error('Error headers:', error.response?.headers);
      console.error('Request config:', error.config);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      console.error('Request headers:', error.config?.headers);
      throw error;
    }
  },
  
  testDeleteRoute: async () => {
    try {
      const response = await api.get('/test-delete-route');
      return response.data;
    } catch (error) {
      console.error('Test route error:', error);
      throw error;
    }
  },
};

export default api;
