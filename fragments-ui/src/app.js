// ✅ PWA VERSION: src/app.js with offline support
import { signIn, signOut, getUser } from "./auth.js";
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

loginButton.onclick = () => {
  console.log("🔐 Login button clicked");
  signIn();
};

logoutButton.onclick = () => {
  console.log("🔐 Logout button clicked");
  signOut();
};

// 🔄 On Load: Try getting user
async function init() {
  const user = await getUser();

  if (user) {
    console.log("✅ User Authenticated via Cognito", { user });
    loginButton.hidden = true;
    logoutButton.hidden = false;
    userSection.hidden = false;
    usernameSpan.textContent = user.username || user.email;
  } else {
    console.log("👤 No user authenticated");
    loginButton.hidden = false;
    logoutButton.hidden = true;
    userSection.hidden = true;
  }
}

// PWA and Service Worker registration
let deferredPrompt;
const installButton = document.querySelector("#install-pwa");
const offlineIndicator = document.querySelector("#offline-indicator");

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );
      console.log("✅ Service Worker registered:", registration);
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
    }
  });
}

// Handle PWA install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);
    deferredPrompt = null;
    installButton.hidden = true;
  }
});

// Handle online/offline status
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineIndicator.style.display = "none";
    offlineManager.showSyncNotification(
      "Connection restored. Syncing offline actions..."
    );
  } else {
    offlineIndicator.style.display = "block";
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

document.addEventListener("DOMContentLoaded", () => {
  init();
  updateOnlineStatus();
});

// 📨 Create Fragment Form
const createForm = document.querySelector("#create-form");
createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = await getUser();
  if (!user) return alert("Please log in");

  const type = document.querySelector("#type").value;
  const content = document.querySelector("#content").value;
  const imageInput = document.querySelector("#image-input");

  let fragmentContent;
  let fragmentType;

  // Handle image upload
  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];
    fragmentContent = await file.arrayBuffer();
    fragmentType = file.type;
  } else if (content.trim()) {
    fragmentContent = content;
    fragmentType = type;
  } else {
    return alert("Please provide content or select an image");
  }

  try {
    const result = await createFragment(user, fragmentContent, fragmentType);
    if (result) {
      document.querySelector(
        "#post-result"
      ).textContent = `✅ Created fragment ID: ${result.fragment.id}`;
      // Cache the new fragment
      await offlineManager.cacheFragment(result.fragment, fragmentContent);
    } else {
      throw new Error("Create fragment failed");
    }
  } catch (error) {
    console.error("Create fragment error:", error);

    if (!navigator.onLine) {
      // Queue for offline sync
      const actionId = await offlineManager.queueOfflineAction(
        "create",
        "/v1/fragments",
        {
          method: "POST",
          headers: user.authorizationHeaders(fragmentType),
          body: fragmentContent,
        },
        { type: fragmentType, content: fragmentContent }
      );

      document.querySelector("#post-result").textContent =
        "📱 Fragment queued for creation when online";
      offlineManager.showOfflineNotification(
        "Fragment will be created when connection is restored"
      );
    } else {
      document.querySelector("#post-result").textContent =
        "❌ Failed to create fragment";
    }
  }

  // Clear form
  document.querySelector("#content").value = "";
  imageInput.value = "";
});

// 📤 Load Fragments with Offline Support
const loadBtn = document.querySelector("#load-fragments");
loadBtn.addEventListener("click", async () => {
  const user = await getUser();
  const list = document.querySelector("#fragment-list");
  list.innerHTML = "<p>⏳ Loading fragments...</p>";

  if (!user) return alert("Please log in to load fragments.");

  try {
    let data;
    let fromCache = false;

    if (navigator.onLine) {
      // Try to load from network first
      data = await getFragments(user);
      if (data && data.fragments) {
        // Cache fragments for offline use
        for (const fragment of data.fragments) {
          await offlineManager.cacheFragment(fragment);
        }
      }
    }

    // If network failed or offline, try cache
    if (!data) {
      const cachedFragments = await offlineManager.getCachedFragments(
        user.sub || user.email
      );
      if (cachedFragments.length > 0) {
        data = { fragments: cachedFragments };
        fromCache = true;
        offlineManager.showOfflineNotification(
          "Showing cached fragments. Some data may be outdated."
        );
      }
    }

    list.innerHTML = "";

    if (!data || !data.fragments) {
      list.innerHTML =
        "<p>❌ Failed to load fragments and no cached data available</p>";
      return;
    }

    if (data.fragments.length === 0) {
      list.innerHTML = "<p>No fragments found.</p>";
      return;
    }

    // Add offline indicator if showing cached data
    if (fromCache) {
      list.innerHTML +=
        "<p style='background: #ff9800; color: white; padding: 8px; border-radius: 4px;'>📱 Showing cached data (offline mode)</p>";
    }

    data.fragments.forEach((frag) => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "10px";
      div.style.margin = "5px 0";
      div.innerHTML = `
      <strong>ID:</strong> ${frag.id}<br>
      <strong>Type:</strong> ${frag.type}<br>
      <strong>Size:</strong> ${frag.size} bytes<br>
      <strong>Created:</strong> ${new Date(frag.created).toLocaleString()}<br>
      <button onclick="viewFragment('${frag.id}')">View</button>
      <button onclick="deleteFragmentById('${frag.id}')">Delete</button>
    `;
      list.appendChild(div);
    });
  } catch (error) {
    console.error("Load fragments error:", error);
    list.innerHTML = "<p>❌ Failed to load fragments. Please try again.</p>";
  }
});

// 🔍 View Fragment
document.querySelector("#view-fragment").addEventListener("click", async () => {
  const id = document.querySelector("#fragment-id").value.trim();
  if (!id) return alert("Please enter a fragment ID");

  await viewFragment(id);
});

// ❌ Delete Fragment
document
  .querySelector("#delete-fragment")
  .addEventListener("click", async () => {
    const id = document.querySelector("#fragment-id").value.trim();
    if (!id) return alert("Please enter a fragment ID");

    await deleteFragmentById(id);
  });

// 🔄 Convert Fragment
document
  .querySelector("#convert-fragment")
  .addEventListener("click", async () => {
    const id = document.querySelector("#conversion-fragment-id").value.trim();
    const format = document.querySelector("#conversion-format").value;

    if (!id) return alert("Please enter a fragment ID");

    await convertFragmentToFormat(id, format);
  });

// Helper Functions
window.viewFragment = async function (id) {
  const user = await getUser();
  if (!user) return alert("Please log in");

  const response = await getFragmentById(user, id);
  const resultContent = document.querySelector("#result-content");

  if (!response) {
    resultContent.innerHTML = "<p>❌ Failed to load fragment</p>";
    return;
  }

  const contentType = response.headers.get("Content-Type");

  if (contentType.startsWith("image/")) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    resultContent.innerHTML = `<img src="${url}" style="max-width: 100%; height: auto;" />`;
  } else {
    const text = await response.text();
    resultContent.innerHTML = `<pre>${text}</pre>`;
  }
};

window.deleteFragmentById = async function (id) {
  const user = await getUser();
  if (!user) return alert("Please log in");

  if (!confirm(`Are you sure you want to delete fragment ${id}?`)) return;

  const result = await deleteFragment(user, id);
  const resultContent = document.querySelector("#result-content");

  if (result) {
    resultContent.innerHTML = `<p>✅ Fragment ${id} deleted successfully</p>`;
    // Reload fragments list
    document.querySelector("#load-fragments").click();
  } else {
    resultContent.innerHTML = `<p>❌ Failed to delete fragment ${id}</p>`;
  }
};

window.convertFragmentToFormat = async function (id, format) {
  const user = await getUser();
  if (!user) return alert("Please log in");

  const response = await convertFragment(user, id, format);
  const resultContent = document.querySelector("#result-content");

  if (!response) {
    resultContent.innerHTML = "<p>❌ Failed to convert fragment</p>";
    return;
  }

  const contentType = response.headers.get("Content-Type");

  if (contentType.startsWith("image/")) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    resultContent.innerHTML = `
      <p>✅ Converted to ${format.toUpperCase()}</p>
      <img src="${url}" style="max-width: 100%; height: auto;" />
    `;
  } else {
    const text = await response.text();
    resultContent.innerHTML = `
      <p>✅ Converted to ${format.toUpperCase()}</p>
      <pre>${text}</pre>
    `;
  }
};
