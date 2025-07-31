document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DOM 元素 & 2. 狀態 & 3. fetchAPI (皆不變) ---
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
  const state = {
    courses: [],
    tasks: [],
    selectedCourseId: null,
    editingItemId: null,
    token: localStorage.getItem("token"),
  };

  async function fetchAPI(method, url, body = null) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
    };
    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`http://localhost:5001${url}`, config);
    if (!response.ok) {
      if (response.status === 401) logout();
      const errorData = await response.json();
      throw new Error(errorData.message || "API 請求失敗");
    }
    // 對於 DELETE 請求，204 No Content 是成功的回應，沒有 body
    return response.status === 204 ? null : response.json();
  }

  // --- 渲染函式 ---
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

  function renderTasks() {
    taskListContainer.innerHTML = "";
    const selectedCourse = state.courses.find(
      (c) => c.id === state.selectedCourseId
    );
    if (!selectedCourse) {
      currentCourseTitle.textContent = "請選擇一門課程";
      addTaskBtn.disabled = true;
      taskListContainer.innerHTML =
        '<p class="empty-list-text">請從左側選擇一門課程以檢視任務。</p>';
      return;
    }
    currentCourseTitle.textContent = selectedCourse.name;
    addTaskBtn.disabled = false;
    const tasksForCourse = state.tasks;
    if (tasksForCourse.length === 0) {
      taskListContainer.innerHTML =
        '<p class="empty-list-text">太棒了，目前沒有待辦任務！</p>';
      return;
    }
    tasksForCourse.forEach((task) => {
      const taskCard = document.createElement("div");
      taskCard.className = `task-card ${task.completed ? "completed" : ""}`;
      taskCard.dataset.id = task.id;
      // ★★★ 關鍵：在 checkbox 和 delete button 上加上 data-task-id ★★★
      taskCard.innerHTML = `
                <div class="task-card-header">
                    <input type="checkbox" class="task-checkbox" data-task-id="${
                      task.id
                    }" ${task.completed ? "checked" : ""}>
                    <h3>${task.title}</h3>
                    <button class="btn-delete" data-task-id="${
                      task.id
                    }">×</button>
                </div>
                <p class="task-meta">截止日期：${task.deadline || "未設定"}</p>
            `;
      taskListContainer.appendChild(taskCard);
    });
  }

  // --- 資料處理函式 ---
  async function loadCourses() {
    try {
      state.courses = await fetchAPI("GET", "/api/courses");
      renderCourses();
    } catch (error) {
      alert(`載入課程失敗: ${error.message}`);
    }
  }
  async function loadTasks(courseId) {
    try {
      state.tasks = await fetchAPI("GET", `/api/courses/${courseId}/tasks`);
      renderTasks();
    } catch (error) {
      alert(`載入任務失敗: ${error.message}`);
    }
  }
  function openModal(type, itemId = null) {
    state.editingItemId = itemId;
    modalForm.innerHTML = "";
    if (type === "course") {
      modalTitle.textContent = "新增課程";
      modalForm.innerHTML = `<div class="form-group"><label for="course-name">課程名稱</label><input type="text" id="course-name" required></div>`;
    } else if (type === "task") {
      modalTitle.textContent = "新增任務";
      modalForm.innerHTML = `<div class="form-group"><label for="task-title">任務標題</label><input type="text" id="task-title" required></div><div class="form-group"><label for="task-deadline">截止日期</label><input type="date" id="task-deadline"></div>`;
    }
    modal.classList.add("show");
  }
  function closeModal() {
    modal.classList.remove("show");
  }

  // ★★★ 核心改造：完成 handleSave 函式 ★★★
  async function handleSave() {
    const formType = modalTitle.textContent.includes("課程")
      ? "course"
      : "task";

    if (formType === "course") {
      const courseName = document.getElementById("course-name").value.trim();
      if (!courseName) return;
      try {
        await fetchAPI("POST", "/api/courses", { name: courseName });
        await loadCourses();
      } catch (error) {
        alert(`儲存課程失敗: ${error.message}`);
      }
    } else if (formType === "task") {
      // ★ 新增 Task 儲存邏輯 ★
      const title = document.getElementById("task-title").value.trim();
      const deadline = document.getElementById("task-deadline").value;
      if (!title) return;

      try {
        await fetchAPI("POST", `/api/courses/${state.selectedCourseId}/tasks`, {
          title,
          deadline,
        });
        await loadTasks(state.selectedCourseId);
      } catch (error) {
        alert(`儲存任務失敗: ${error.message}`);
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
    if (!state.token) {
      logout();
      return;
    }

    // ★★★ 核心改造：為任務列表加上點擊事件，處理完成和刪除 ★★★
    taskListContainer.addEventListener("click", async (e) => {
      const target = e.target;
      const taskId = target.dataset.taskId;

      if (!taskId) return; // 如果點到的不是帶有 data-task-id 的元素，就忽略

      // 處理勾選框
      if (target.classList.contains("task-checkbox")) {
        try {
          const isCompleted = target.checked;
          await fetchAPI("PATCH", `/api/tasks/${taskId}`, {
            completed: isCompleted,
          });
          target
            .closest(".task-card")
            .classList.toggle("completed", isCompleted);
        } catch (error) {
          alert(`更新任務失敗: ${error.message}`);
          target.checked = !target.checked;
        }
      }

      // 處理刪除按鈕
      if (target.classList.contains("btn-delete")) {
        if (confirm("確定要刪除這個任務嗎？")) {
          try {
            await fetchAPI("DELETE", `/api/tasks/${taskId}`);
            await loadTasks(state.selectedCourseId);
          } catch (error) {
            alert(`刪除任務失敗: ${error.message}`);
          }
        }
      }
    });

    // 其他事件監聽器
    courseList.addEventListener("click", async (e) => {
      e.preventDefault();
      if (e.target.tagName === "A") {
        state.selectedCourseId = parseInt(e.target.dataset.id);
        renderCourses();
        await loadTasks(state.selectedCourseId);
      }
    });
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
    addCourseBtn.addEventListener("click", () => openModal("course"));
    addTaskBtn.addEventListener("click", () => {
      if (state.selectedCourseId) {
        openModal("task");
      }
    });
    modalCancelBtn.addEventListener("click", closeModal);
    modalSaveBtn.addEventListener("click", handleSave);

    await loadCourses();
    renderTasks();
  }

  init();
});
