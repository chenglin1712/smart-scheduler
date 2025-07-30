// js/dashboard.js

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

  // --- 2. 應用程式的狀態 (State) ---
  let state = {
    courses: JSON.parse(localStorage.getItem("courses")) || [],
    tasks: JSON.parse(localStorage.getItem("tasks")) || [],
    selectedCourseId: null,
    editingItemId: null, // 用來判斷是新增還是編輯
  };

  // --- 3. 核心渲染函式 (Render Functions) ---

  // 渲染課程列表 (左側邊欄)
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

  // 渲染任務列表 (右側主內容)
  function renderTasks() {
    taskListContainer.innerHTML = "";
    if (!state.selectedCourseId) {
      taskListContainer.innerHTML =
        '<p class="empty-list-text">請從左側選擇一門課程以檢視任務。</p>';
      currentCourseTitle.textContent = "請選擇一門課程";
      addTaskBtn.disabled = true;
      return;
    }

    const selectedCourse = state.courses.find(
      (c) => c.id === state.selectedCourseId
    );
    currentCourseTitle.textContent = selectedCourse.name;
    addTaskBtn.disabled = false;

    const tasksForCourse = state.tasks.filter(
      (t) => t.courseId === state.selectedCourseId
    );

    if (tasksForCourse.length === 0) {
      taskListContainer.innerHTML =
        '<p class="empty-list-text">太棒了，目前沒有待辦任務！</p>';
      return;
    }

    tasksForCourse.forEach((task) => {
      const taskCard = document.createElement("div");
      taskCard.className = `task-card ${task.completed ? "completed" : ""}`;
      taskCard.dataset.id = task.id;
      taskCard.innerHTML = `
                <div class="task-card-header">
                    <input type="checkbox" class="task-checkbox" ${
                      task.completed ? "checked" : ""
                    }>
                    <h3>${task.title}</h3>
                    <button class="btn-delete">×</button>
                </div>
                <p class="task-meta">截止日期：${task.deadline}</p>
            `;
      taskListContainer.appendChild(taskCard);
    });
  }

  // --- 4. 資料儲存函式 ---
  function saveData() {
    localStorage.setItem("courses", JSON.stringify(state.courses));
    localStorage.setItem("tasks", JSON.stringify(state.tasks));
  }

  // --- 5. Modal 彈出視窗相關函式 ---
  function openModal(type, itemId = null) {
    state.editingItemId = itemId;
    modalForm.innerHTML = ""; // 清空之前的表單

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
    } else if (type === "task") {
      modalTitle.textContent = itemId ? "編輯任務" : "新增任務";
      const task = itemId ? state.tasks.find((t) => t.id === itemId) : {};
      modalForm.innerHTML = `
                <div class="form-group">
                    <label for="task-title">任務標題</label>
                    <input type="text" id="task-title" value="${
                      task.title || ""
                    }" required>
                </div>
                <div class="form-group">
                    <label for="task-deadline">截止日期</label>
                    <input type="date" id="task-deadline" value="${
                      task.deadline || ""
                    }" required>
                </div>
            `;
    }
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
  }

  // --- 6. 事件處理函式 (Event Handlers) ---

  // 處理儲存按鈕 (Modal)
  function handleSave() {
    const formType = modalTitle.textContent.includes("課程")
      ? "course"
      : "task";

    if (formType === "course") {
      const courseName = document.getElementById("course-name").value.trim();
      if (!courseName) return;

      if (state.editingItemId) {
        // 編輯模式
        const course = state.courses.find((c) => c.id === state.editingItemId);
        course.name = courseName;
      } else {
        // 新增模式
        const newCourse = { id: Date.now(), name: courseName };
        state.courses.push(newCourse);
        state.selectedCourseId = newCourse.id; // 新增後自動選取
      }
    } else if (formType === "task") {
      const taskTitle = document.getElementById("task-title").value.trim();
      const taskDeadline = document.getElementById("task-deadline").value;
      if (!taskTitle || !taskDeadline) return;

      if (state.editingItemId) {
        // 編輯模式
        const task = state.tasks.find((t) => t.id === state.editingItemId);
        task.title = taskTitle;
        task.deadline = taskDeadline;
      } else {
        // 新增模式
        const newTask = {
          id: Date.now(),
          courseId: state.selectedCourseId,
          title: taskTitle,
          deadline: taskDeadline,
          completed: false,
        };
        state.tasks.push(newTask);
      }
    }

    saveData();
    renderAll();
    closeModal();
  }

  // 處理課程列表點擊
  courseList.addEventListener("click", (e) => {
    e.preventDefault();
    if (e.target.tagName === "A") {
      state.selectedCourseId = parseInt(e.target.dataset.id);
      renderAll();
    }
  });

  // 處理任務列表點擊 (完成/刪除)
  taskListContainer.addEventListener("click", (e) => {
    const taskCard = e.target.closest(".task-card");
    if (!taskCard) return;

    const taskId = parseInt(taskCard.dataset.id);
    const task = state.tasks.find((t) => t.id === taskId);

    if (e.target.classList.contains("task-checkbox")) {
      task.completed = e.target.checked;
    }
    if (e.target.classList.contains("btn-delete")) {
      if (confirm(`確定要刪除任務 "${task.title}" 嗎？`)) {
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
      }
    }

    saveData();
    renderTasks(); // 只需重新渲染任務列表，效率更高
  });

  // --- 7. 設定按鈕的事件監聽器 ---
  addCourseBtn.addEventListener("click", () => openModal("course"));
  addTaskBtn.addEventListener("click", () => openModal("task"));
  modalCancelBtn.addEventListener("click", closeModal);
  modalSaveBtn.addEventListener("click", handleSave);

  // --- 8. 初始渲染 ---
  function renderAll() {
    renderCourses();
    renderTasks();
  }
  renderAll();
});
