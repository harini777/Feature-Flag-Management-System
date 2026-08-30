import axios from "axios";
// Create a reusable Axios instance for communicating
// with our FastAPI backend.
const api = axios.create({
    // FastAPI backend is running on port 8000,it tells the fastapi is running on localhost 8000 to reactfrontend
  baseURL: "http://localhost:8000",
});

export default api;