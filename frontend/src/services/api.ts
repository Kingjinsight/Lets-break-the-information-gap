import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加认证 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理认证错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 检查是否是登录或注册相关的 API 调用
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                             error.config?.url?.includes('/auth/register');
      
      // 检查当前是否在登录或注册页面
      const isAuthPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/register';
      
      // 只有在不是认证页面且不是认证端点时才重定向
      if (!isAuthEndpoint && !isAuthPage) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关 API - 修复登录格式
export const authApi = {
  login: (email: string, password: string) => {
    // FastAPI 期望 form-data 格式
    const formData = new FormData();
    formData.append('username', email);  // 注意：FastAPI 使用 username 字段
    formData.append('password', password);
    
    return api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  
  getCurrentUser: () => api.get('/auth/me'),
};


// RSS 源相关 API
export const rssApi = {
  getSources: () => api.get('/rss-sources/'),
  
  validateSource: (url: string) =>
    api.post('/rss-sources/validate', { url }),
  
  createSource: (url: string, title?: string) =>
    api.post('/rss-sources/', { url, title }),
  
  deleteSource: (id: number) => api.delete(`/rss-sources/${id}`),
  
  refreshSource: (id: number) => api.post(`/rss-sources/${id}/fetch`),
  
  refreshAllSources: () => api.post('/rss-sources/refresh-all'),
  
  fetchAllArticles: () => api.post('/rss-sources/fetch-all'),
  
  analyzeSocialUrl: (url: string) =>
    api.post('/rss-sources/analyze-social-url', { url }),
  
  getSocialPlatforms: () => api.get('/rss-sources/social-platforms'),
};

// 文章相关 API
export const articlesApi = {
  getTodayArticles: () => 
    api.get('/articles/today'),

  markAsRead: (articleId: number) =>
    api.put(`/articles/${articleId}/read`),

  markAsUnread: (articleId: number) =>
    api.put(`/articles/${articleId}/unread`),

  createPodcastFromArticles: (articleIds: number[], title?: string) =>
    api.post('/articles/select-for-podcast', { 
      article_ids: articleIds, 
      title 
    }),

  getStats: () =>
    api.get('/articles/stats'),
};

// 播客相关 API
export const podcastsApi = {
  getPodcasts: () => api.get('/podcasts/'),
  
  getPodcast: (id: number) => api.get(`/podcasts/${id}`),
  
  generateTodayPodcast: (title?: string) =>
    api.post('/podcasts/generate-today', { title }),
  
  createPodcast: (articleIds: number[], title?: string) =>
    api.post('/podcasts/create', { article_ids: articleIds, title }),
  
  createPodcastFromArticles: (articleIds: number[], title?: string) =>
    api.post('/podcasts/from-articles', { 
      article_ids: articleIds, 
      title 
    }),
  
  getTaskStatus: (taskId: string) => api.get(`/podcasts/task/${taskId}`),
  
  deletePodcast: (id: number) => api.delete(`/podcasts/${id}`),
  
  getAudioStream: (id: number) => `${API_BASE_URL}/podcasts/${id}/audio`,
  
  downloadAudio: (id: number) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/podcasts/${id}/audio`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

export const settingsApi = {
  getSettings: () => api.get('/settings/'),
  
  updateSettings: (settings: any) => api.put('/settings/', settings),
};

export default api;


