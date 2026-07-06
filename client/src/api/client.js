import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Fetch a CSRF token and attach it to all subsequent mutation requests
let csrfToken = null;

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const { data } = await axios.get('/api/csrf-token', { withCredentials: true });
  csrfToken = data.csrfToken;
  return csrfToken;
}

// Attach CSRF token to every non-GET request
api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    const token = await ensureCsrfToken();
    config.headers['x-csrf-token'] = token;
  }
  return config;
});

// If we get a 403 with CSRF error, refresh the token and retry once
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (
      err.response?.status === 403 &&
      err.response?.data?.error === 'Invalid CSRF token' &&
      !err.config._csrfRetried
    ) {
      csrfToken = null;
      const token = await ensureCsrfToken();
      err.config._csrfRetried = true;
      err.config.headers['x-csrf-token'] = token;
      return api(err.config);
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe = () =>
  api.get('/auth/me').then(r => r.data);

// Users
export const getUsers = () =>
  api.get('/users').then(r => r.data);

export const createUser = (data) =>
  api.post('/users', data).then(r => r.data);

export const updateUser = (id, data) =>
  api.patch(`/users/${id}`, data).then(r => r.data);

export const deleteUser = (id) =>
  api.delete(`/users/${id}`).then(r => r.data);

// Tasks
export const getTasks = (includeInactive = false) =>
  api.get('/tasks', { params: { include_inactive: includeInactive } }).then(r => r.data);

export const createTask = (data) =>
  api.post('/tasks', data).then(r => r.data);

export const updateTask = (id, data) =>
  api.patch(`/tasks/${id}`, data).then(r => r.data);

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`).then(r => r.data);

export const updateTaskInstructions = (id, instructions) =>
  api.patch(`/tasks/${id}/instructions`, { instructions }).then(r => r.data);

// Task Instances
export const getInstances = (date, userId) =>
  api.get('/instances', { params: { date, user_id: userId } }).then(r => r.data);

export const createInstance = (data) =>
  api.post('/instances', data).then(r => r.data);

export const updateInstance = (id, data) =>
  api.patch(`/instances/${id}`, data).then(r => r.data);

export const deleteInstance = (id) =>
  api.delete(`/instances/${id}`).then(r => r.data);

// History
export const getHistory = (params) =>
  api.get('/history', { params }).then(r => r.data);

export const getAuditLog = (limit) =>
  api.get('/history/audit', { params: { limit } }).then(r => r.data);

export default api;
