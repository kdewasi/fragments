// Basic Auth for local testing (Assignment 3 compatible)
const TEST_USER = {
  username: "kdewasi",
  email: "kishandewasi606@gmail.com",
  password: "Jckzwtjh7d",
  sub: "test-user-123", // Mock sub for compatibility
};

function formatUser(user) {
  return {
    username: user.username,
    email: user.email,
    sub: user.sub,
    authorizationHeaders: (type = "application/json") => ({
      "Content-Type": type,
      Authorization: `Basic ${btoa(`${user.email}:${user.password}`)}`,
    }),
  };
}

export async function getUser() {
  // For local testing, return the test user immediately
  return formatUser(TEST_USER);
}

export function signIn() {
  // For local testing, simulate successful login
  console.log("✅ Signed in with Basic Auth for testing");
  window.location.reload(); // Refresh to update UI
  return Promise.resolve();
}

export function signOut() {
  // For local testing, simulate logout
  console.log("✅ Signed out");
  window.location.reload(); // Refresh to update UI
  return Promise.resolve();
}
