// ✅ ENHANCED PWA VERSION: src/app.js with comprehensive functionality
// Use Basic Auth for local testing (Assignment 3 compatible)
import { signIn, signOut, getUser } from "./auth-basic.js";
import {
  getFragments,
  createFragment,
  getFragmentById,
  getFragmentInfo,
  updateFragment,
  deleteFragment,
  convertFragment,
} from "./api.js";
import { offlineManager } from "./offline.js";

// 🔐 Authentication Elements
const loginButton = document.querySelector("#login");
const logoutButton = document.querySelector("#logout");
const userSection = document.querySelector("#user");
const usernameSpan = document.querySelector(".username");

// 📝 Form Elements
const createForm = document.querySelector("#create-form");
const typeSelect = document.querySelector("#type");
const contentTextarea = document.querySelector("#content");
const imageInput = document.querySelector("#image-input");
const createButton = createForm.querySelector('button[type="submit"]');
const postResult = document.querySelector("#post-result");

// 📋 Fragment Management Elements
const loadFragmentsButton = document.querySelector("#load-fragments");
const fragmentList = document.querySelector("#fragment-list");
const fragmentIdInput = document.querySelector("#fragment-id");
const viewButton = document.querySelector("#view-fragment");
const deleteButton = document.querySelector("#delete-fragment");
const updateButton = document.querySelector("#update-fragment");

// 🔄 Conversion Elements
const conversionFragmentIdInput = document.querySelector(
  "#conversion-fragment-id"
);
const conversionFormatSelect = document.querySelector("#conversion-format");
const convertButton = document.querySelector("#convert-fragment");

// 📊 Results Elements
const resultContent = document.querySelector("#result-content");

// 📱 PWA Elements
const installButton = document.querySelector("#install-pwa");
const offlineIndicator = document.querySelector("#offline-indicator");

// 🎯 Global State
let currentFragments = [];
let selectedFragmentId = null;

// 🔔 Notification System
function showNotification(message, type = "info", duration = 5000) {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
          ? "fa-exclamation-circle"
          : "fa-info-circle"
      }"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
    padding: 1rem;
    border-radius: 0.75rem;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(20px);
    border: 1px solid;
    animation: slideInRight 0.3s ease;
    cursor: pointer;
  `;

  if (type === "success") {
    notification.style.background = "rgba(63, 185, 80, 0.15)";
    notification.style.borderColor = "#3fb950";
    notification.style.color = "#3fb950";
  } else if (type === "error") {
    notification.style.background = "rgba(248, 81, 73, 0.15)";
    notification.style.borderColor = "#f85149";
    notification.style.color = "#f85149";
  } else {
    notification.style.background = "rgba(88, 166, 255, 0.15)";
    notification.style.borderColor = "#58a6ff";
    notification.style.color = "#58a6ff";
  }

  document.body.appendChild(notification);

  // Auto remove
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = "slideOutRight 0.3s ease forwards";
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);

  // Click to dismiss
  notification.onclick = () => notification.remove();
}

// 🎨 Loading State Management
function setLoading(element, loading = true) {
  if (loading) {
    element.disabled = true;
    element.classList.add("loading");
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.innerHTML = `<div class="spinner"></div> Loading...`;
  } else {
    element.disabled = false;
    element.classList.remove("loading");
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
    }
  }
}

// 🔐 Authentication Logic
loginButton.onclick = async () => {
  console.log("🔐 Login button clicked");
  setLoading(loginButton, true);
  try {
    await signIn();
    await init();
    showNotification("Successfully signed in!", "success");
  } catch (error) {
    console.error("Login failed:", error);
    showNotification("Login failed. Please try again.", "error");
  } finally {
    setLoading(loginButton, false);
  }
};

logoutButton.onclick = async () => {
  console.log("🔐 Logout button clicked");
  try {
    await signOut();
    await init();
    showNotification("Successfully signed out!", "info");
    clearResults();
    clearFragmentList();
  } catch (error) {
    console.error("Logout failed:", error);
    showNotification("Logout failed. Please try again.", "error");
  }
};

// 🔄 Initialization
async function init() {
  try {
    const user = await getUser();

    if (user) {
      console.log("✅ User Authenticated via Basic Auth", { user });
      loginButton.hidden = true;
      logoutButton.hidden = false;
      userSection.hidden = false;
      usernameSpan.textContent = user.username || user.email;

      // Enable all functionality
      enableAppFunctionality();
    } else {
      console.log("👤 No user authenticated");
      loginButton.hidden = false;
      logoutButton.hidden = true;
      userSection.hidden = true;

      // Disable functionality
      disableAppFunctionality();
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    showNotification(
      "Initialization failed. Please refresh the page.",
      "error"
    );
  }
}

function enableAppFunctionality() {
  const elements = [
    createForm,
    loadFragmentsButton,
    viewButton,
    deleteButton,
    updateButton,
    convertButton,
  ];
  elements.forEach((el) => {
    if (el) {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    }
  });
}

function disableAppFunctionality() {
  const elements = [
    createForm,
    loadFragmentsButton,
    viewButton,
    deleteButton,
    updateButton,
    convertButton,
  ];
  elements.forEach((el) => {
    if (el) {
      el.style.opacity = "0.5";
      el.style.pointerEvents = "none";
    }
  });
}

// 📝 Fragment Creation
createForm.onsubmit = async (e) => {
  e.preventDefault();

  const type = typeSelect.value;
  const content = contentTextarea.value.trim();
  const file = imageInput.files[0];

  if (!content && !file) {
    showNotification(
      "Please enter content or select an image to upload.",
      "error"
    );
    return;
  }

  if (content && file) {
    showNotification(
      "Please choose either text content OR image upload, not both.",
      "error"
    );
    return;
  }

  setLoading(createButton, true);

  try {
    const user = await getUser();
    let result;

    if (file) {
      // Validate file type before upload
      if (!file.type.startsWith("image/")) {
        showNotification(
          "Please select a valid image file (PNG, JPEG, etc.)",
          "error"
        );
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification(
          "Image file is too large. Please select a file smaller than 5MB.",
          "error"
        );
        return;
      }

      // Handle image upload - convert File to ArrayBuffer
      console.log(
        `📷 Uploading image: ${file.name}, type: ${file.type}, size: ${file.size} bytes`
      );
      const arrayBuffer = await file.arrayBuffer();
      console.log(
        `📦 Converted to ArrayBuffer: ${arrayBuffer.byteLength} bytes`
      );

      result = await createFragment(user, arrayBuffer, file.type);
      showNotification(
        `Image fragment created successfully! Type: ${file.type}`,
        "success"
      );
    } else {
      // Handle text content
      console.log(
        `📝 Creating text fragment: type=${type}, length=${content.length}`
      );
      result = await createFragment(user, content, type);
      showNotification(
        `Text fragment created successfully! Type: ${type}`,
        "success"
      );
    }

    console.log("✅ Fragment created:", result);

    // Clear form
    contentTextarea.value = "";
    imageInput.value = "";
    typeSelect.selectedIndex = 0;
    resetFileDropZone();

    // Show success in results
    displayResult({
      action: "Fragment Created",
      fragmentId: result.fragment.id,
      type: result.fragment.type,
      size: result.fragment.size,
      created: result.fragment.created,
    });

    // Auto-refresh fragment list if it's been loaded before
    if (currentFragments.length > 0) {
      await loadFragments();
    }
  } catch (error) {
    console.error("❌ Create fragment failed:", error);
    showNotification(`Failed to create fragment: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    setLoading(createButton, false);
  }
};

// 📋 Load Fragments
loadFragmentsButton.onclick = async () => {
  await loadFragments();
};

async function loadFragments() {
  setLoading(loadFragmentsButton, true);

  try {
    const user = await getUser();

    if (navigator.onLine) {
      const response = await getFragments(user);
      console.log("🔍 API Response:", response);

      // Handle null response (API error)
      if (!response) {
        throw new Error("Failed to load fragments from server");
      }

      // Handle API response format: { status: "ok", fragments: [...] }
      const fragments = response.fragments || [];
      console.log("📋 Extracted fragments:", fragments);
      currentFragments = fragments;

      // Cache fragments offline
      for (const fragment of fragments) {
        await offlineManager.cacheFragment(fragment);
      }

      if (fragments.length > 0) {
        showNotification(
          `Loaded ${fragments.length} fragments successfully!`,
          "success"
        );
      } else {
        showNotification(
          "No fragments found. Create your first fragment to get started!",
          "info"
        );
      }
    } else {
      // Load from cache when offline
      const cachedFragments = await offlineManager.getCachedFragments(user.sub);
      currentFragments = Array.isArray(cachedFragments) ? cachedFragments : [];
      showNotification(
        `Loaded ${currentFragments.length} fragments from cache (offline mode)`,
        "info"
      );
    }

    displayFragments(currentFragments);
    displayResult({
      action: "Fragments Loaded",
      count: currentFragments.length,
      fragments: currentFragments.map((f) => ({
        id: f.id,
        type: f.type,
        size: f.size,
      })),
    });
  } catch (error) {
    console.error("❌ Load fragments failed:", error);
    showNotification(`Failed to load fragments: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    setLoading(loadFragmentsButton, false);
  }
}

// 🎨 Display Fragments
function displayFragments(fragments) {
  // Ensure fragments is always an array
  const fragmentsArray = Array.isArray(fragments) ? fragments : [];

  if (fragmentsArray.length === 0) {
    fragmentList.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
        <i class="fas fa-inbox" style="margin-right: 0.5rem;"></i>
        No fragments found. Create your first fragment!
      </p>
    `;
    return;
  }

  fragmentList.innerHTML = fragmentsArray
    .map(
      (fragment) => `
    <div class="fragment-item" data-fragment-id="${
      fragment.id
    }" onclick="selectFragment('${fragment.id}')">
      <div class="fragment-header">
        <div class="fragment-info">
          <h4 class="fragment-id">ID: ${fragment.id}</h4>
          <div class="fragment-meta">
            <span class="fragment-type">${fragment.type}</span>
            <span>Size: ${fragment.size} bytes</span>
          </div>
          <div class="fragment-meta">
            <span>Created: ${new Date(fragment.created).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="fragment-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: space-between;">
        <button class="btn btn-primary" onclick="event.stopPropagation(); viewFragmentData('${
          fragment.id
        }')" style="flex: 1; padding: 0.625rem 1rem; font-size: 0.8rem; min-width: 70px;">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn btn-danger" onclick="event.stopPropagation(); handleFragmentDelete(this, '${
          fragment.id
        }')" style="flex: 1; padding: 0.625rem 1rem; font-size: 0.8rem; min-width: 70px;">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

// 🎯 Fragment Selection
window.selectFragment = selectFragment;

function selectFragment(fragmentId) {
  selectedFragmentId = fragmentId;
  fragmentIdInput.value = fragmentId;
  conversionFragmentIdInput.value = fragmentId;

  // Highlight selected fragment
  document.querySelectorAll(".fragment-item").forEach((item) => {
    item.classList.remove("selected");
  });
  document
    .querySelector(`[data-fragment-id="${fragmentId}"]`)
    ?.classList.add("selected");

  showNotification(
    `Fragment ${fragmentId.substring(0, 8)}... selected`,
    "info",
    3000
  );
}

// 👁️ View Fragment
viewButton.onclick = async () => {
  const fragmentId = fragmentIdInput.value.trim();
  if (!fragmentId) {
    showNotification(
      "Please enter a fragment ID or select one from the list.",
      "error"
    );
    return;
  }

  await viewFragmentData(fragmentId);
};

// Make viewFragmentData globally accessible
window.viewFragmentData = viewFragmentData;

async function viewFragmentData(fragmentId) {
  setLoading(viewButton, true);

  try {
    const user = await getUser();
    console.log("🔍 Fetching fragment data for:", fragmentId);

    const dataResponse = await getFragmentById(user, fragmentId);
    const info = await getFragmentInfo(user, fragmentId);

    console.log("📋 Fragment data response:", dataResponse);
    console.log("ℹ️ Fragment info:", info);

    // Handle null responses
    if (!info) {
      throw new Error("Failed to get fragment information");
    }

    if (!dataResponse) {
      throw new Error("Failed to get fragment data");
    }

    // Parse fragment data from response
    let fragmentData;
    const contentType = dataResponse.headers.get("content-type") || "";

    if (
      contentType.startsWith("text/") ||
      contentType.includes("json") ||
      contentType.includes("yaml")
    ) {
      fragmentData = await dataResponse.text();
    } else {
      // Binary data
      const arrayBuffer = await dataResponse.arrayBuffer();
      fragmentData = `[Binary Data - ${arrayBuffer.byteLength} bytes]`;
    }

    // Handle API response format - extract fragment info from response
    const fragmentInfo = info.fragment || info;

    // Scroll to results section
    document.querySelector(".results-section").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    displayResult({
      action: "Fragment Data Retrieved",
      fragmentId: fragmentId,
      type: fragmentInfo.type || "Unknown",
      size: fragmentInfo.size || 0,
      created: fragmentInfo.created || new Date().toISOString(),
      updated: fragmentInfo.updated || null,
      data: fragmentData,
      contentType: contentType,
      rawInfo: fragmentInfo, // For debugging
    });

    showNotification(
      "Fragment data retrieved successfully! Check the Results section below.",
      "success",
      7000
    );
  } catch (error) {
    console.error("❌ View fragment failed:", error);
    showNotification(`Failed to view fragment: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    setLoading(viewButton, false);
  }
}

// 🗑️ Delete Fragment
deleteButton.onclick = async () => {
  const fragmentId = fragmentIdInput.value.trim();
  if (!fragmentId) {
    showNotification(
      "Please enter a fragment ID or select one from the list.",
      "error"
    );
    return;
  }

  if (
    !confirm(
      `Are you sure you want to delete fragment ${fragmentId.substring(
        0,
        8
      )}...?`
    )
  ) {
    return;
  }

  await deleteFragmentById(fragmentId);
};

// Handle delete from fragment list (with specific button)
window.handleFragmentDelete = async (buttonElement, fragmentId) => {
  if (
    !confirm(
      `Are you sure you want to delete fragment ${fragmentId.substring(
        0,
        8
      )}...?`
    )
  ) {
    return;
  }

  await deleteFragmentById(fragmentId, buttonElement);
};

async function deleteFragmentById(fragmentId, buttonElement = null) {
  // Use the provided button element or fall back to the main delete button
  const targetButton = buttonElement || deleteButton;

  if (targetButton) {
    setLoading(targetButton, true);
  }

  try {
    const user = await getUser();
    await deleteFragment(user, fragmentId);

    displayResult({
      action: "Fragment Deleted",
      fragmentId: fragmentId,
      timestamp: new Date().toISOString(),
    });

    showNotification("Fragment deleted successfully!", "success");

    // Refresh fragment list
    await loadFragments();

    // Clear inputs if this was the selected fragment
    if (fragmentIdInput.value === fragmentId) {
      fragmentIdInput.value = "";
      conversionFragmentIdInput.value = "";
      selectedFragmentId = null;
    }
  } catch (error) {
    console.error("❌ Delete fragment failed:", error);
    showNotification(`Failed to delete fragment: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    if (targetButton) {
      setLoading(targetButton, false);
    }
  }
}

// ✏️ Update Fragment
updateButton.onclick = async () => {
  const fragmentId = fragmentIdInput.value.trim();
  if (!fragmentId) {
    showNotification("Please enter a fragment ID to update.", "error");
    return;
  }

  const newContent = prompt("Enter new content for this fragment:");
  if (!newContent) {
    return;
  }

  setLoading(updateButton, true);

  try {
    const user = await getUser();
    const result = await updateFragment(user, fragmentId, newContent);

    displayResult({
      action: "Fragment Updated",
      fragmentId: fragmentId,
      newSize: result.fragment.size,
      updated: result.fragment.updated,
    });

    showNotification("Fragment updated successfully!", "success");

    // Refresh fragment list
    await loadFragments();
  } catch (error) {
    console.error("❌ Update fragment failed:", error);
    showNotification(`Failed to update fragment: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    setLoading(updateButton, false);
  }
};

// 🔄 Convert Fragment
convertButton.onclick = async () => {
  const fragmentId = conversionFragmentIdInput.value.trim();
  const format = conversionFormatSelect.value;

  if (!fragmentId) {
    showNotification("Please enter a fragment ID to convert.", "error");
    return;
  }

  setLoading(convertButton, true);

  try {
    const user = await getUser();
    const convertedData = await convertFragment(user, fragmentId, format);

    displayResult({
      action: "Fragment Converted",
      fragmentId: fragmentId,
      originalFormat: "auto-detected",
      convertedTo: format,
      data: typeof convertedData === "string" ? convertedData : "[Binary Data]",
    });

    showNotification(
      `Fragment converted to ${format} successfully!`,
      "success"
    );
  } catch (error) {
    console.error("❌ Convert fragment failed:", error);
    showNotification(`Failed to convert fragment: ${error.message}`, "error");
    displayResult({ error: error.message });
  } finally {
    setLoading(convertButton, false);
  }
};

// 📊 Display Results
function displayResult(data) {
  if (data.error) {
    resultContent.innerHTML = `
      <div style="color: var(--accent-secondary); padding: 1rem;">
        <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
        <strong>Error:</strong> ${data.error}
      </div>
    `;
  } else {
    // Special handling for fragment data view
    if (data.action === "Fragment Data Retrieved") {
      resultContent.innerHTML = `
        <div style="color: var(--text-primary);">
          <h4 style="color: var(--accent-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-eye"></i>
            Fragment Data: ${data.fragmentId.substring(0, 8)}...
          </h4>
          <div style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border-primary);">
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 1rem 2rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <strong style="color: var(--accent-primary);">Type:</strong>
              <span style="color: var(--text-secondary);">${data.type}</span>
              <strong style="color: var(--accent-primary);">Size:</strong>
              <span style="color: var(--text-secondary);">${
                data.size
              } bytes</span>
              <strong style="color: var(--accent-primary);">Created:</strong>
              <span style="color: var(--text-secondary);">${new Date(
                data.created
              ).toLocaleString()}</span>
              ${
                data.updated
                  ? `<strong style="color: var(--accent-primary);">Updated:</strong><span style="color: var(--text-secondary);">${new Date(
                      data.updated
                    ).toLocaleString()}</span>`
                  : ""
              }
            </div>
            <div style="border-top: 1px solid var(--border-primary); padding-top: 1.5rem;">
              <strong style="color: var(--accent-primary); display: block; margin-bottom: 0.75rem;">Content:</strong>
              <pre style="background: var(--bg-primary); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; color: var(--text-primary); border: 1px solid var(--border-secondary); max-height: 300px; overflow-y: auto;">${
                data.data
              }</pre>
            </div>
          </div>
        </div>
      `;
    } else {
      // Default display for other results
      resultContent.innerHTML = `
        <div style="color: var(--text-primary);">
          <h4 style="color: var(--accent-primary); margin-bottom: 1rem;">
            <i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>
            ${data.action}
          </h4>
          <pre style="background: var(--bg-elevated); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; color: var(--text-secondary);">${JSON.stringify(
            data,
            null,
            2
          )}</pre>
        </div>
      `;
    }
  }
}

function clearResults() {
  resultContent.innerHTML = `
    <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
      <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
      Results and API responses will appear here...
    </p>
  `;
}

function clearFragmentList() {
  fragmentList.innerHTML = `
    <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
      Click "Load My Fragments" to see your data
    </p>
  `;
  currentFragments = [];
}

// PWA and Service Worker registration
let deferredPrompt;
const offlineManager_import = offlineManager;

// Register service worker
if ("serviceWorker" in navigator) {
  // Try multiple service worker paths for Parcel compatibility
  const swPaths = ["/service-worker.js", "./service-worker.js"];

  async function registerServiceWorker() {
    for (const path of swPaths) {
      try {
        const registration = await navigator.serviceWorker.register(path);
        console.log("✅ Service Worker registered:", registration);
        return registration;
      } catch (error) {
        console.log(`❌ Failed to register SW at ${path}:`, error);
      }
    }
    console.log("❌ All service worker registration attempts failed");
  }

  registerServiceWorker();
}

// PWA Install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("🔥 beforeinstallprompt event fired!");
  e.preventDefault();
  deferredPrompt = e;
  installButton.hidden = false;
  showNotification(
    "App can now be installed! Click the Install App button.",
    "info",
    10000
  );
});

// PWA Installation Debugging
function debugPWAInstallation() {
  console.group("🔍 PWA Installation Debug");

  // Check basic PWA support
  console.log("Service Worker support:", "serviceWorker" in navigator);
  console.log(
    "beforeinstallprompt support:",
    "onbeforeinstallprompt" in window
  );
  console.log("Current protocol:", window.location.protocol);
  console.log("Current origin:", window.location.origin);

  // Check if already installed
  if (
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    console.log("✅ App is already installed (running in standalone mode)");
    if (installButton) {
      installButton.style.display = "none";
    }
  } else {
    console.log("❌ App is not installed (running in browser)");
  }

  // Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  console.log("Manifest link found:", !!manifestLink);
  if (manifestLink) {
    console.log("Manifest href:", manifestLink.href);
  }

  // Check HTTPS (not required for localhost)
  if (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost"
  ) {
    console.log("✅ HTTPS requirement met (or localhost)");
  } else {
    console.log("❌ HTTPS required for PWA installation");
  }

  console.groupEnd();
}

// Show install button for testing and run debug
if (installButton) {
  installButton.hidden = false;
  console.log("📱 Install button made visible for testing");

  // Run debug after a short delay to let everything load
  setTimeout(debugPWAInstallation, 1000);
}

installButton?.addEventListener("click", async () => {
  console.log("📱 Install button clicked, deferredPrompt:", !!deferredPrompt);

  if (!deferredPrompt) {
    // Fallback for browsers that don't support beforeinstallprompt
    showNotification(
      "PWA installation not available. Try: Chrome/Edge > Menu > Install app, or add to home screen on mobile.",
      "info",
      10000
    );
    return;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);

    if (outcome === "accepted") {
      showNotification("App installation started!", "success");
    } else {
      showNotification("App installation cancelled.", "info");
    }

    deferredPrompt = null;
    installButton.hidden = true;
  } catch (error) {
    console.error("PWA install error:", error);
    showNotification(`Installation failed: ${error.message}`, "error");
  }
});

// Online/Offline status
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineIndicator.style.display = "none";
  } else {
    offlineIndicator.style.display = "block";
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// Add CSS for notifications and selected fragments
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .notification-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    margin-left: auto;
  }
  
  .notification-close:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .fragment-item.selected {
    border-color: var(--accent-primary) !important;
    background: rgba(88, 166, 255, 0.1) !important;
    transform: translateX(4px);
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 0.5rem;
  }
  
  .loading {
    opacity: 0.7;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

// 📁 File Upload Enhancement
const fileDropZone = document.querySelector(".file-drop-zone");

// Handle file input change
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    console.log("📁 File selected:", file.name, file.type, file.size);

    // Check if it's an image
    if (file.type.startsWith("image/")) {
      const fileName = file.name;
      const fileSize = (file.size / 1024).toFixed(1) + " KB";
      fileDropZone.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--accent-success);"></i>
        <p><strong>${fileName}</strong><br>Size: ${fileSize}<br>Type: ${file.type}</p>
      `;

      showNotification(`Image selected: ${fileName}`, "success", 3000);
    } else {
      showNotification(
        `Please select an image file. ${file.type} is not supported.`,
        "error"
      );
      imageInput.value = ""; // Clear the input
    }
  }
});

// Reset file drop zone when form is cleared
function resetFileDropZone() {
  fileDropZone.innerHTML = `
    <i class="fas fa-cloud-upload-alt"></i>
    <p>Click to select or drag & drop an image</p>
  `;
}

// Initialize the app
init();
