// src/api/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/', // 🔁 Adjust if your backend uses another port
  headers: {
    'Content-Type': 'application/json'
  }
});

export default axiosInstance;
