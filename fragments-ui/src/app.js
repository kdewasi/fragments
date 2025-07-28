// ✅ FINAL VERSION: src/app.js
import { signIn, getUser } from "./auth.js";
import { getFragments, createFragment } from "./api.js";

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

  const result = await createFragment(user, content, type);
  document.querySelector("#post-result").textContent = result
    ? `✅ Created fragment ID: ${result.fragment.id}`
    : "❌ Failed to create fragment";
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
    list.innerHTML = "<li>❌ Failed to load fragments</li>";
    return;
  }

  data.fragments.forEach((frag) => {
    const li = document.createElement("li");
    li.textContent = `ID: ${frag.id} | Type: ${frag.type} | Size: ${frag.size}`;
    list.appendChild(li);
  });
});
