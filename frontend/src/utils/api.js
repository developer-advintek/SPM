import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Products
export const getProducts = async () => {
  const response = await axios.get(`${API}/products`, { headers: getAuthHeaders() });
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await axios.post(`${API}/products`, productData, { headers: getAuthHeaders() });
  return response.data;
};

export const bulkUploadProducts = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API}/products/bulk-upload`, formData, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Transactions
export const getTransactions = async () => {
  const response = await axios.get(`${API}/transactions`, { headers: getAuthHeaders() });
  return response.data;
};

export const createTransaction = async (txnData) => {
  const response = await axios.post(`${API}/transactions`, txnData, { headers: getAuthHeaders() });
  return response.data;
};

// Commissions
export const getMyEarnings = async () => {
  const response = await axios.get(`${API}/commissions/my-earnings`, { headers: getAuthHeaders() });
  return response.data;
};

// Plans
export const getCommissionPlans = async () => {
  const response = await axios.get(`${API}/plans`, { headers: getAuthHeaders() });
  return response.data;
};

export const createCommissionPlan = async (planData) => {
  const response = await axios.post(`${API}/plans`, planData, { headers: getAuthHeaders() });
  return response.data;
};

export default {
  getProducts,
  createProduct,
  bulkUploadProducts,
  getTransactions,
  createTransaction,
  getMyEarnings,
  getCommissionPlans,
  createCommissionPlan
};
