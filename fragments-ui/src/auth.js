// ✅ LOCAL TESTING VERSION: Basic Auth for Lab 9
// Temporary override for local testing with Basic Auth backend

// Basic Auth credentials for local testing
const TEST_USER = {
  username: "kdewasi",
  email: "kishandewasi606@gmail.com",
  password: "Jckzwtjh7d",
};

function formatUser(user) {
  return {
    username: user.username,
    email: user.email,
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
  // For local testing, no redirect needed
  return Promise.resolve();
}
