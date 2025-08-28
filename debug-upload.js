// Debug script to test image upload functionality
// Run this in the browser console on your fragments-ui page

console.log("🧪 Starting image upload debug...");

// Test 1: Check if the upload elements exist
const imageInput = document.querySelector("#image-input");
const fileDropZone = document.querySelector(".file-drop-zone");
const createForm = document.querySelector("#create-form");

console.log("📋 Element Check:");
console.log("- Image Input:", imageInput ? "✅ Found" : "❌ Missing");
console.log("- Drop Zone:", fileDropZone ? "✅ Found" : "❌ Missing");
console.log("- Create Form:", createForm ? "✅ Found" : "❌ Missing");

if (!imageInput || !fileDropZone || !createForm) {
  console.error(
    "❌ Required elements missing! Check if the UI loaded correctly."
  );
}

// Test 2: Create a test file blob
const testImageBlob = new Blob(["fake-image-data"], { type: "image/png" });
const testFile = new File([testImageBlob], "test-image.png", {
  type: "image/png",
});

console.log("📸 Test File Created:");
console.log("- Name:", testFile.name);
console.log("- Type:", testFile.type);
console.log("- Size:", testFile.size);

// Test 3: Check API function
async function testAPI() {
  console.log("🌐 Testing API connection...");

  const TEST_USER = {
    authorizationHeaders: (type = "application/json") => ({
      "Content-Type": type,
      Authorization: `Basic ${btoa("kishandewasi606@gmail.com:Jckzwtjh7d")}`,
    }),
  };

  try {
    // Test basic connectivity
    const response = await fetch(
      "http://fragments-alb-1899681317.us-east-1.elb.amazonaws.com/v1/fragments",
      {
        headers: TEST_USER.authorizationHeaders(),
      }
    );

    console.log("✅ API Response:", response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log("📋 Current fragments:", data.fragments?.length || 0);
    }

    return TEST_USER;
  } catch (error) {
    console.error("❌ API Error:", error);
    return null;
  }
}

// Test 4: Test image upload process
async function testImageUpload() {
  console.log("📤 Testing image upload process...");

  const user = await testAPI();
  if (!user) {
    console.error("❌ Cannot test upload - API connection failed");
    return;
  }

  try {
    // Convert test file to ArrayBuffer
    const arrayBuffer = await testFile.arrayBuffer();
    console.log("📦 ArrayBuffer created:", arrayBuffer.byteLength, "bytes");

    // Make upload request
    const response = await fetch(
      "http://fragments-alb-1899681317.us-east-1.elb.amazonaws.com/v1/fragments",
      {
        method: "POST",
        headers: {
          ...user.authorizationHeaders(testFile.type),
          "Content-Type": testFile.type,
        },
        body: arrayBuffer,
      }
    );

    console.log("📤 Upload Response:", response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Upload Success:", result);
    } else {
      const errorText = await response.text();
      console.error("❌ Upload Failed:", errorText);
    }
  } catch (error) {
    console.error("❌ Upload Error:", error);
  }
}

// Test 5: Check if form submission works
function testFormSubmission() {
  console.log("📝 Testing form submission...");

  if (!imageInput || !createForm) {
    console.error("❌ Form elements not found");
    return;
  }

  // Create a DataTransfer object to simulate file selection
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(testFile);
  imageInput.files = dataTransfer.files;

  console.log("📁 File assigned to input:", imageInput.files[0]?.name);

  // Check if change event fires
  const changeEvent = new Event("change", { bubbles: true });
  imageInput.dispatchEvent(changeEvent);

  console.log("🔄 Change event dispatched");
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running all debug tests...");
  console.log("=".repeat(50));

  await testAPI();
  await testImageUpload();
  testFormSubmission();

  console.log("=".repeat(50));
  console.log("✅ Debug tests completed!");
  console.log("💡 Check the console output above for any issues.");
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.debugUpload = {
  testAPI,
  testImageUpload,
  testFormSubmission,
  runAllTests,
};

console.log("💡 Debug functions available as window.debugUpload");
console.log("💡 You can also run: debugUpload.testImageUpload()");
