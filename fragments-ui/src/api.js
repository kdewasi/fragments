// ✅ FINAL VERSION: src/api.js

const apiUrl = "http://fragments-alb-1899681317.us-east-1.elb.amazonaws.com"; // ✅ NEW Production ALB DNS

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
 * @param {string|ArrayBuffer|Blob} content - The content of the fragment
 * @param {string} type - MIME type (e.g., "text/plain", "application/json")
 * @returns {Object|null} The JSON response from the API or null on error
 */
export async function createFragment(user, content, type = "text/plain") {
  try {
    console.log(`🚀 Creating fragment with type: ${type}, content type: ${typeof content}`);
    
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: "POST",
      headers: {
        ...user.authorizationHeaders(type),
        "Content-Type": type,
      },
      body: content,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API Error: ${res.status} ${res.statusText}`, errorText);
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    const result = await res.json();
    console.log("✅ Fragment created successfully:", result);
    return result;
  } catch (err) {
    console.error("❌ POST /v1/fragments failed", err);
    throw err; // Re-throw to let the UI handle the error
  }
}

/**
 * Get fragment data by ID
 * @param {Object} user - The authenticated user
 * @param {string} id - Fragment ID
 * @returns {Response|null} The response or null on error
 */
export async function getFragmentById(user, id) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  } catch (err) {
    console.error("❌ GET /v1/fragments/:id failed", err);
    return null;
  }
}

/**
 * Get fragment metadata by ID
 * @param {Object} user - The authenticated user
 * @param {string} id - Fragment ID
 * @returns {Object|null} The JSON response or null on error
 */
export async function getFragmentInfo(user, id) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}/info`, {
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("❌ GET /v1/fragments/:id/info failed", err);
    return null;
  }
}

/**
 * Update a fragment
 * @param {Object} user - The authenticated user
 * @param {string} id - Fragment ID
 * @param {string|ArrayBuffer} content - New content
 * @param {string} type - MIME type
 * @returns {Object|null} The JSON response or null on error
 */
export async function updateFragment(user, id, content, type) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      method: "PUT",
      headers: {
        ...user.authorizationHeaders(),
        "Content-Type": type,
      },
      body: content,
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("❌ PUT /v1/fragments/:id failed", err);
    return null;
  }
}

/**
 * Delete a fragment
 * @param {Object} user - The authenticated user
 * @param {string} id - Fragment ID
 * @returns {Object|null} The JSON response or null on error
 */
export async function deleteFragment(user, id) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      method: "DELETE",
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("❌ DELETE /v1/fragments/:id failed", err);
    return null;
  }
}

/**
 * Convert fragment to different format
 * @param {Object} user - The authenticated user
 * @param {string} id - Fragment ID
 * @param {string} ext - Target extension (e.g., 'html', 'json')
 * @returns {Response|null} The response or null on error
 */
export async function convertFragment(user, id, ext) {
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}.${ext}`, {
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  } catch (err) {
    console.error("❌ GET /v1/fragments/:id.ext failed", err);
    return null;
  }
}
