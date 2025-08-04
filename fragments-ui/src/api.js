// ✅ FINAL VERSION: src/api.js

const apiUrl = "http://54.174.150.51:8080"; // ✅ Your EC2 IP

/**
 * Fetch all fragments for the authenticated user.
 * @param {Object} user - The authenticated user with `authorizationHeaders()` method
 * @returns {Object|null} The JSON response from the API or null on error
 */
export async function getFragments(user) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("❌ GET /v1/fragments failed", err);
    return null;
  }
}

/**
 * Create a new fragment for the authenticated user.
 * @param {Object} user - The authenticated user
 * @param {string} content - The content of the fragment
 * @param {string} type - MIME type (e.g., "text/plain", "application/json")
 * @returns {Object|null} The JSON response from the API or null on error
 */
export async function createFragment(user, content, type = "text/plain") {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: "POST",
      headers: {
        ...user.authorizationHeaders(),
        "Content-Type": type,
      },
      body: content,
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("❌ POST /v1/fragments failed", err);
    return null;
  }
}
