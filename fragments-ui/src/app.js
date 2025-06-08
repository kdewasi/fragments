import { signIn, getUser } from './auth.js';

const apiUrl = 'http://localhost:8080'; // 🔥 Hardcoded backend API URL

const loginButton = document.querySelector('#login');
const userSection = document.querySelector('#user');
const usernameSpan = document.querySelector('.username');

loginButton.onclick = () => {
  console.log('🔐 Login button clicked');
  signIn(); // Redirect to Cognito Hosted UI
};

async function init() {
  const user = await getUser();

  if (user) {
    console.log('✅ User Authenticated', { user });

    // Show user section and hide login
    loginButton.hidden = true;
    userSection.hidden = false;
    usernameSpan.textContent = user.username || user.email;

    // 🔄 Make authenticated API call to fragments microservice
    console.log('📡 Fetching /v1/fragments with user token...');
    console.log('🧾 Headers:', user.authorizationHeaders());

    try {
      const res = await fetch(`${apiUrl}/v1/fragments`, {
        headers: user.authorizationHeaders(),
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('📦 User Fragments:', data);
    } catch (err) {
      console.error('❌ Error fetching fragments:', err);
    }

  } else {
    console.log('👤 No user is authenticated');
  }
}

document.addEventListener('DOMContentLoaded', init);
