// js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  // 如果使用者已經登入 (localStorage 中有 token)，直接導向儀表板
  if (localStorage.getItem("token")) {
    window.location.href = "dashboard.html";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // 防止表單的預設送出行為
    errorMessage.textContent = ""; // 清空之前的錯誤訊息

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      // 1. 使用 fetch API 發送 POST 請求到後端登入端點
      const response = await fetch("http://localhost:5001/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // 2. 檢查後端的回應
      if (!response.ok) {
        // 如果後端回傳錯誤 (例如 400, 401)，顯示錯誤訊息
        throw new Error(data.message || "登入失敗");
      }

      // 3. 登入成功，將後端回傳的 token 存到 localStorage
      localStorage.setItem("token", data.token);

      // 4. 導向到儀表板頁面
      window.location.href = "dashboard.html";
    } catch (error) {
      // 捕獲 fetch 錯誤或後端回傳的錯誤，並顯示出來
      errorMessage.textContent = error.message;
    }
  });
});
