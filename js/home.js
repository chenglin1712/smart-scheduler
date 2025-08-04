// js/home.js
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. 抓取所有需要的 DOM 元素 ---
  const greetingEl = document.getElementById("greeting");
  const userDetailsEl = document.getElementById("user-details");
  const userAvatarEl = document.getElementById("user-avatar");
  const courseCountEl = document.getElementById("widget-course-count");
  const studyTimeEl = document.getElementById("widget-study-time");
  const todayTasksContainer = document.getElementById("today-tasks-container");
  const logoutButton = document.getElementById("logout-btn");
  const spinner = document.getElementById("spinner-overlay"); // 我們也需要在首頁使用 spinner

  const token = localStorage.getItem("token");

  // --- 2. 輔助函式 ---

  // 取得個人化問候語
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 5) {
      return "凌晨了，早點休息";
    }
    if (hour < 12) {
      return "早安";
    }
    if (hour < 18) {
      return "午安";
    }
    return "晚安";
  }

  // 專為首頁使用的 API 請求函式
  async function fetchHomeAPI(url) {
    spinner.style.display = "flex";
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`http://localhost:5001${url}`, { headers });
      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error("無法獲取資料");
      }
      return response.json();
    } finally {
      spinner.style.display = "none";
    }
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }

  // --- 3. 主要初始化函式 ---
  async function initializeHomepage() {
    // 路由守衛
    if (!token) {
      logout();
      return;
    }

    // 綁定登出事件
    if (logoutButton) {
      logoutButton.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }

    try {
      // 平行發出兩個 API 請求，獲取所有需要的數據
      const [userData, summaryData] = await Promise.all([
        fetchHomeAPI("/api/users/me"),
        fetchHomeAPI("/api/home/summary"),
      ]);

      // --- 渲染個人化 Profile ---
      greetingEl.textContent = `${getGreeting()}，${userData.name}`;
      userDetailsEl.textContent = `${userData.university || ""} ${
        userData.department || ""
      }`;
      if (userData.avatarUrl) {
        userAvatarEl.src = userData.avatarUrl;
      }

      // --- 渲染 Widgets ---
      courseCountEl.textContent = summaryData.courseCount;
      // 將分鐘轉換為小時，並保留一位小數
      const hours = (summaryData.totalStudyTime / 60).toFixed(1);
      studyTimeEl.textContent = `${hours} 小時`;

      // --- 渲染今日焦點 ---
      // 為了簡化，我們先只顯示今日到期任務的數量
      // 之後可以再擴充，去撈取完整的任務列表
      todayTasksContainer.innerHTML = ""; // 清空載入中提示
      if (summaryData.tasksDueTodayCount > 0) {
        const todayFocusItem = document.createElement("div");
        todayFocusItem.className = "focus-item";
        todayFocusItem.innerHTML = `
                    <div class="focus-icon warning">⚠️</div>
                    <div class="focus-content">
                        <h3>今日到期任務</h3>
                        <p>你今天有 <strong>${summaryData.tasksDueTodayCount}</strong> 個任務即將到期，前往儀表板查看！</p>
                    </div>
                    <a href="dashboard.html" class="focus-link">→</a>
                `;
        todayTasksContainer.appendChild(todayFocusItem);
      } else {
        const todayFocusItem = document.createElement("div");
        todayFocusItem.className = "focus-item";
        todayFocusItem.innerHTML = `
                    <div class="focus-icon success">✅</div>
                    <div class="focus-content">
                        <h3>今日無緊急任務</h3>
                        <p>太棒了！今天沒有任務到期，安排一下新的學習計畫吧！</p>
                    </div>
                `;
        todayTasksContainer.appendChild(todayFocusItem);
      }
    } catch (error) {
      console.error("初始化首頁時發生錯誤:", error);
      showToast("載入首頁資訊失敗，請稍後再試。", "error");
    }
  }

  // 執行初始化
  initializeHomepage();
});
