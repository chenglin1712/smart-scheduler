// js/dashboard.js (全新改造後版本)

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. 抓取所有需要的 DOM 元素 ---
  const courseList = document.getElementById("course-list");
  const taskListContainer = document.getElementById("task-list-container");
  const currentCourseTitle = document.getElementById("current-course-title");
  const addCourseBtn = document.getElementById("add-course-btn");
  const addTaskBtn = document.getElementById("add-task-btn");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm = document.getElementById("modal-form");
  const modalSaveBtn = document.getElementById("modal-save-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const logoutButton = document.getElementById("logout-btn");

  // --- 2. 應用程式的狀態 (State) ---
  const state = {
    courses: [], // 資料將從後端獲取
    tasks: [], // 暫時還沒用到
    selectedCourseId: null,
    editingItemId: null,
    token: localStorage.getItem("token"),
  };

  // --- ★★★ 核心改造：可重複使用的 API 請求函式 ★★★ ---
  async function fetchAPI(method, url, body = null) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`, // 帶上我們的 JWT 通行證
    };

    const config = {
      method: method,
      headers: headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:5001${url}`, config);

    if (!response.ok) {
      // 如果是 401 (未授權)，可能 token 過期，直接踢回登入頁
      if (response.status === 401) {
        logout();
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "API 請求失敗");
    }

    // 如果是 204 (No Content) 這種沒有 body 的成功回應，直接回傳 null
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // --- 3. 渲染函式 (Render Functions) - 這部分幾乎不變 ---
  function renderCourses() {
    courseList.innerHTML = "";
    if (state.courses.length === 0) {
      courseList.innerHTML =
        '<p class="empty-list-text">點擊上方 + 新增課程</p>';
    } else {
      state.courses.forEach((course) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#" data-id="${course.id}">${course.name}</a>`;
        if (course.id === state.selectedCourseId) {
          li.querySelector("a").classList.add("active");
        }
        courseList.appendChild(li);
      });
    }
  }
  // 任務渲染函式暫時保留，但先不使用
  function renderTasks() {
    // ... 我們下個步驟再來實作 ...
    currentCourseTitle.textContent = state.selectedCourseId
      ? state.courses.find((c) => c.id === state.selectedCourseId)?.name ||
        "選擇課程"
      : "請選擇一門課程";
    taskListContainer.innerHTML =
      '<p class="empty-list-text">任務功能將在下一步實作。</p>';
  }

  // --- 4. 資料處理函式 (Data Handlers) ---
  async function loadCourses() {
    try {
      const courses = await fetchAPI("GET", "/api/courses");
      state.courses = courses;
      renderCourses();
    } catch (error) {
      alert(`載入課程失敗: ${error.message}`);
    }
  }

  function openModal(type, itemId = null) {
    // ... 這部分邏輯不變 ...
    state.editingItemId = itemId;
    modalForm.innerHTML = "";

    if (type === "course") {
      modalTitle.textContent = itemId ? "編輯課程" : "新增課程";
      const course = itemId ? state.courses.find((c) => c.id === itemId) : {};
      modalForm.innerHTML = `
                <div class="form-group">
                    <label for="course-name">課程名稱</label>
                    <input type="text" id="course-name" value="${
                      course.name || ""
                    }" required>
                </div>
            `;
    } // 任務 Modal 暫不處理
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
  }

  async function handleSave() {
    const formType = modalTitle.textContent.includes("課程")
      ? "course"
      : "task";

    if (formType === "course") {
      const courseName = document.getElementById("course-name").value.trim();
      if (!courseName) return;

      try {
        if (state.editingItemId) {
          // 編輯邏輯 (暫不實作)
        } else {
          // ★★★ 核心改造：呼叫後端 API 新增課程 ★★★
          await fetchAPI("POST", "/api/courses", { name: courseName });
        }
        // 成功後，重新從伺服器載入一次課程列表，確保資料同步
        await loadCourses();
      } catch (error) {
        alert(`儲存課程失敗: ${error.message}`);
      }
    }
    closeModal();
  }

  // --- 5. 登出與初始化 ---
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }

  async function init() {
    // 路由守衛
    if (!state.token) {
      logout();
      return;
    }

    // 綁定事件監聽器
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });

    addCourseBtn.addEventListener("click", () => openModal("course"));
    modalCancelBtn.addEventListener("click", closeModal);
    modalSaveBtn.addEventListener("click", handleSave);

    // 頁面載入時，自動從後端獲取課程資料
    await loadCourses();
    // 順便渲染一下任務區塊的初始狀態
    renderTasks();
  }

  // --- 執行初始化 ---
  init();
});
