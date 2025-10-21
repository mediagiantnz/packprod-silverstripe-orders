export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api';

export const API_CONFIG = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
