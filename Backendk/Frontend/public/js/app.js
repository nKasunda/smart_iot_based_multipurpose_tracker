const API_BASE = 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('jwt_token');
}

function setToken(token) {
  localStorage.setItem('jwt_token', token);
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// Global fetch wrapper injecting JWT
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logout();
    }
    throw new Error(data.error || 'API Error');
  }
  return data;
}

// Redirect helpers
function requireAuth() {
  if (!getToken()) window.location.href = '/login.html';
}

function redirectIfAuth() {
  if (getToken()) window.location.href = '/';
}

// Helper to update UI based on role
function applyRoleBasedUI() {
  const user = getUser();
  if (!user) return;
  document.getElementById('nav-user-name').innerText = user.name;
  
  if (user.role !== 'admin') {
    const adminEls = document.querySelectorAll('.admin-only');
    adminEls.forEach(el => el.style.display = 'none');
  }
}

// Google Login Handler
async function handleCredentialResponse(response) {
  try {
    const data = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential })
    });
    setToken(data.token);
    setUser(data.user);
    window.location.href = '/';
  } catch (error) {
    alert("Google Sign-in Failed: " + error.message);
  }
}
