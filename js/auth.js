// js/auth.js (導向新首頁版本)
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  // 如果使用者已經登入 (localStorage 中有 token)，直接導向新首頁
  if (localStorage.getItem("token")) {
    window.location.href = "home.html";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("http://localhost:5001/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "登入失敗");
      }

      localStorage.setItem("token", data.token);

      // ★★★ 核心修改：將登入後的導向目標改為 home.html ★★★
      window.location.href = "home.html";
    } catch (error) {
      errorMessage.textContent = error.message;
    }
  });
});
