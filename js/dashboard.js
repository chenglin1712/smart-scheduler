document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DOM 元素 ---
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

  // --- 2. 應用程式狀態 ---
  const state = {
    courses: [],
    tasks: [],
    selectedCourseId: null,
    editingItemId: null,
    token: localStorage.getItem("token"),
  };

  // --- 3. 可重複使用的 API 請求函式 (強健版) ---
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

      const contentType = response.headers.get("content-type");
      let errorData;

      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        const errorText = await response.text();
        errorData = { message: errorText };
      }
      throw new Error(errorData.message || "API 請求失敗，且無錯誤訊息。");
    }

    return response.status === 204 ? null : response.json();
  }

  // --- 4. 渲染函式 ---
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
      taskCard.dataset.actualTime = task.actualTime || 0;
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
                <div class="task-time-info">
                    <span>預計 ${task.estimatedTime || "-"} 分鐘 / 已花費 ${
        task.actualTime || 0
      } 分鐘</span>
                    <button class="btn-add-time" data-task-id="${
                      task.id
                    }">增加時間</button>
                </div>
            `;
      taskListContainer.appendChild(taskCard);
    });
  }

  // --- 5. 資料處理函式 ---
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
      modalForm.innerHTML = `
                <div class="form-group">
                    <label for="task-title">任務標題</label>
                    <input type="text" id="task-title" required>
                </div>
                <div class="form-group">
                    <label for="task-deadline">截止日期</label>
                    <input type="date" id="task-deadline">
                </div>
                <div class="form-group">
                    <label for="task-estimated-time">預計花費時間 (分鐘)</label>
                    <input type="number" id="task-estimated-time" min="0">
                </div>
            `;
    }
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
        await fetchAPI("POST", "/api/courses", { name: courseName });
        await loadCourses();
      } catch (error) {
        alert(`儲存課程失敗: ${error.message}`);
      }
    } else if (formType === "task") {
      const title = document.getElementById("task-title").value.trim();
      const deadline = document.getElementById("task-deadline").value;
      const estimatedTime =
        parseInt(document.getElementById("task-estimated-time").value) || null;
      if (!title) return;
      try {
        await fetchAPI("POST", `/api/courses/${state.selectedCourseId}/tasks`, {
          title,
          deadline,
          estimatedTime,
        });
        await loadTasks(state.selectedCourseId);
      } catch (error) {
        alert(`儲存任務失敗: ${error.message}`);
      }
    }
    closeModal();
  }

  // --- 6. 登出與初始化 ---
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }

  async function init() {
    if (!state.token) {
      logout();
      return;
    }

    taskListContainer.addEventListener("click", async (e) => {
      const target = e.target;
      const taskId = target.dataset.taskId;
      if (!taskId) return;

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

      if (target.classList.contains("btn-add-time")) {
        const timeToAddStr = prompt("請輸入你這次花費的分鐘數：", "30");
        const timeToAdd = parseInt(timeToAddStr);
        if (timeToAddStr === null || isNaN(timeToAdd) || timeToAdd < 0) {
          return;
        }
        const taskCard = target.closest(".task-card");
        const currentActualTime = parseInt(taskCard.dataset.actualTime) || 0;
        const newActualTime = currentActualTime + timeToAdd;
        try {
          await fetchAPI("PATCH", `/api/tasks/${taskId}`, {
            actualTime: newActualTime,
          });
          await loadTasks(state.selectedCourseId);
        } catch (error) {
          alert(`更新時間失敗: ${error.message}`);
        }
      }
    });

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
