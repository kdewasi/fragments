import { UserManager } from 'oidc-client-ts';

// 🔁 Replace these values with YOUR Cognito config if different
const clientId = '7dbkmbrk3lrcv3202ln86do2u0';
const poolId = 'us-east-1_t6yugxIK2';
const redirectUri = 'http://localhost:1234';

// Derive region from Pool ID
const region = poolId.split('_')[0];

const userManager = new UserManager({
  authority: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email',
});

// 🔧 Format the user object to simplify access and log info
function formatUser(user) {
  console.log('✅ User Authenticated');
  console.log({ user }); // 🪵 Show full user object in console

  return {
    username: user.profile['cognito:username'],
    email: user.profile.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

// 🔁 Get the current user or handle redirect login
export async function getUser() {
  if (window.location.search.includes('code=')) {
    const user = await userManager.signinCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }

  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}

// 🔐 Trigger redirect to Cognito Hosted UI for login
export function signIn() {
  return userManager.signinRedirect();
}
