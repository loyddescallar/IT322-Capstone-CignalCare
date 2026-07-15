import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const getAttachmentUrl = (fileName) => {
  if (!fileName) return '';

  const value = String(fileName).trim();

  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }

  return `${API_ORIGIN}/uploads/messages/${encodeURIComponent(value)}`;
};

/*
 * Do not force a global Content-Type here.
 * Axios must choose the correct header automatically:
 *   - plain objects  -> application/json
 *   - FormData       -> multipart/form-data; boundary=...
 *
 * A forced application/json header turns uploaded File objects into {},
 * which prevents Multer and Cloudinary from receiving the attachment.
 */
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData && config.headers) {
      // AxiosHeaders in Axios v1.
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        // Fallback for a plain headers object.
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname || '';
      const isAdminPath =
        currentPath.startsWith('/admin') ||
        currentPath === '/admin-dashboard';

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminUser');

      window.location.href = isAdminPath ? '/admin-login' : '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
