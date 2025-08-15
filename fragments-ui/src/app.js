// ✅ FINAL VERSION: src/app.js
import { signIn, getUser } from "./auth.js";
import {
  getFragments,
  createFragment,
  getFragmentById,
  getFragmentInfo,
  updateFragment,
  deleteFragment,
  convertFragment,
} from "./api.js";

// 🔐 Login Button
const loginButton = document.querySelector("#login");
const userSection = document.querySelector("#user");
const usernameSpan = document.querySelector(".username");

loginButton.onclick = () => {
  console.log("🔐 Login button clicked");
  signIn();
};

// 🔄 On Load: Try getting user
async function init() {
  const user = await getUser();

  if (user) {
    console.log("✅ User Authenticated", { user });
    loginButton.hidden = true;
    userSection.hidden = false;
    usernameSpan.textContent = user.username || user.email;
  } else {
    console.log("👤 No user authenticated");
  }
}

document.addEventListener("DOMContentLoaded", init);

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

  const result = await createFragment(user, fragmentContent, fragmentType);
  document.querySelector("#post-result").textContent = result
    ? `✅ Created fragment ID: ${result.fragment.id}`
    : "❌ Failed to create fragment";

  // Clear form
  document.querySelector("#content").value = "";
  imageInput.value = "";
});

// 📤 Load Fragments
const loadBtn = document.querySelector("#load-fragments");
loadBtn.addEventListener("click", async () => {
  const user = await getUser();
  const list = document.querySelector("#fragment-list");
  list.innerHTML = "";

  if (!user) return alert("Please log in to load fragments.");

  const data = await getFragments(user);
  if (!data) {
    list.innerHTML = "<p>❌ Failed to load fragments</p>";
    return;
  }

  if (data.fragments.length === 0) {
    list.innerHTML = "<p>No fragments found.</p>";
    return;
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
