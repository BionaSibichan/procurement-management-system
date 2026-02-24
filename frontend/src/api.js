import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");
      const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {
        refresh,
      });

      localStorage.setItem("access", res.data.access);
      originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
