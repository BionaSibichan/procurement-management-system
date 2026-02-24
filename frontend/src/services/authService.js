import axios from "axios";

const API = "http://127.0.0.1:8000/api/login";

export const loginUser = (data) => {
  return axios.post(`${API}/`, data);
};
