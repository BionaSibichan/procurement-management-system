import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// GET vendors
export const getVendors = (token) =>
  api.get("vendors/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// ADD vendor
export const addVendor = (data, token) =>
  api.post("vendors/", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export default api;
