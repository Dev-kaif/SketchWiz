
import axios from 'axios';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authorization");

    if (token) {
      config.headers["authorization"] = `${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axios;