// Amazon Cognito authentication using oidc-client-ts
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

// Cognito configuration for fragments app
const cognitoConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_2zaNaWSL5",
  client_id: "47v2i0gp7gbjojks3dtcb6cdmm",
  redirect_uri: `${window.location.origin}/callback`,
  response_type: "code",
  scope: "openid email profile",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/silent-callback.html`,
  post_logout_redirect_uri: window.location.origin,
};

const userManager = new UserManager(cognitoConfig);

// Format user for our app
function formatUser(user) {
  return {
    username: user.profile.preferred_username || user.profile.email,
    email: user.profile.email,
    sub: user.profile.sub,
    authorizationHeaders: (type = "application/json") => ({
      "Content-Type": type,
      Authorization: `Bearer ${user.access_token}`,
    }),
  };
}

// Get current authenticated user
export async function getUser() {
  try {
    const user = await userManager.getUser();
    if (user && !user.expired) {
      return formatUser(user);
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Sign in with Cognito
export function signIn() {
  return userManager.signinRedirect();
}

// Sign out
export function signOut() {
  return userManager.signoutRedirect();
}

// Handle callback after authentication
export async function handleCallback() {
  try {
    const user = await userManager.signinRedirectCallback();
    return formatUser(user);
  } catch (error) {
    console.error("Error handling callback:", error);
    throw error;
  }
}

// Handle silent callback for token renewal
export async function handleSilentCallback() {
  try {
    await userManager.signinSilentCallback();
  } catch (error) {
    console.error("Error handling silent callback:", error);
  }
}

// Initialize auth manager
userManager.events.addUserLoaded((user) => {
  console.log("User loaded:", user.profile.email);
});

userManager.events.addUserUnloaded(() => {
  console.log("User unloaded");
});

userManager.events.addAccessTokenExpiring(() => {
  console.log("Access token expiring");
});

userManager.events.addAccessTokenExpired(() => {
  console.log("Access token expired");
});

userManager.events.addSilentRenewError((error) => {
  console.error("Silent renew error:", error);
});
