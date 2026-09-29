import axios from 'axios';

// Assuming your FastAPI runs on localhost:8000
const API_URL = 'http://localhost:8000/api/v1/orchestrator';

// We will need to pass the JWT token for authentication
const getAuthHeaders = () => {
  const token = localStorage.getItem('token'); // Adjust this if you store your token differently
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const startChat = async (message) => {
  const response = await axios.post(`${API_URL}/chat`, 
    { message: message, action: "start" },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const resumeChat = async (threadId) => {
  const response = await axios.post(`${API_URL}/chat`, 
    { message: "", thread_id: threadId, action: "resume" },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const checkChatStatus = async (taskId) => {
  const response = await axios.get(`${API_URL}/chat/status/${taskId}`, 
    { headers: getAuthHeaders() }
  );
  return response.data;
};