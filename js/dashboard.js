// js/dashboard.js (AI 介面最終版)
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DOM 元素 (加入新元素) ---
  const courseList = document.getElementById("course-list");
  const taskListContainer = document.getElementById("task-list-container");
  const currentCourseTitle = document.getElementById("current-course-title");
  const addCourseBtn = document.getElementById("add-course-btn");
  const addTaskBtn = document.getElementById("add-task-btn");
  const modal = document.getElementById("modal"); // ... (其他 modal 元素不變)
  const modalTitle = document.getElementById("modal-title"),
    modalForm = document.getElementById("modal-form"),
    modalSaveBtn = document.getElementById("modal-save-btn"),
    modalCancelBtn = document.getElementById("modal-cancel-btn");
  const logoutButton = document.getElementById("logout-btn");
  // ★ 新增文件管理區塊的元素
  const docManagementSection = document.getElementById(
    "document-management-section"
  );
  const documentList = document.getElementById("document-list");
  const documentUploadInput = document.getElementById("document-upload-input");
  const uploadDocBtn = document.getElementById("upload-doc-btn");
  const analyzeBtn = document.getElementById("analyze-btn");
  const fileNameDisplay = document.getElementById("file-name-display");

  // --- 2. 應用程式狀態 (加入 documents) ---
  const state = {
    courses: [],
    tasks: [],
    documents: [], // ★ 新增
    selectedCourseId: null,
    token: localStorage.getItem("token"),
  };

  // --- 3. API 請求函式 (★ 升級版，可處理 JSON 和 FormData) ★ ---
  async function fetchAPI(method, url, body = null) {
    const headers = { Authorization: `Bearer ${state.token}` };
    const config = { method, headers };

    if (body) {
      if (body instanceof FormData) {
        // 如果是 FormData，瀏覽器會自動設定 Content-Type，我們不能手動設定
        config.body = body;
      } else {
        // 否則，我們假設是 JSON
        headers["Content-Type"] = "application/json";
        config.body = JSON.stringify(body);
      }
    }
    // ... (其餘錯誤處理邏輯不變)
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
      throw new Error(errorData.message || "API 請求失敗");
    }
    return response.status === 204 ? null : response.json();
  }

  // --- 4. 渲染函式 (加入 renderDocuments) ---
  function renderCourses() {
    /* ... 不變 ... */
  }
  function renderTasks() {
    /* ... 不變 ... */
  }
  // ★ 新增：渲染文件列表的函式
  function renderDocuments() {
    documentList.innerHTML = "";
    if (state.documents.length === 0) {
      documentList.innerHTML =
        '<p class="empty-list-text">此課程尚無文件。</p>';
    } else {
      state.documents.forEach((doc) => {
        const docItem = document.createElement("div");
        docItem.className = "document-item";
        docItem.innerHTML = `<span>📄 ${doc.fileName}</span>`;
        documentList.appendChild(docItem);
      });
    }
  }

  // --- 5. 資料處理函式 (加入 loadDocuments) ---
  async function loadCourses() {
    /* ... 不變 ... */
  }
  async function loadTasks(courseId) {
    /* ... 不變 ... */
  }
  // ★ 新增：載入特定課程的文件的函式
  async function loadDocuments(courseId) {
    try {
      const documents = await fetchAPI(
        "GET",
        `/api/documents/course/${courseId}`
      );
      state.documents = documents;
      renderDocuments();
    } catch (error) {
      alert(`載入文件列表失敗: ${error.message}`);
    }
  }
  // ... (openModal, closeModal, handleSave for courses/tasks 不變)

  // --- 6. 登出與初始化 ---
  function logout() {
    /* ... 不變 ... */
  }

  async function init() {
    if (!state.token) {
      logout();
      return;
    }

    // 課程列表點擊事件 (★ 改造：加入載入文件)
    courseList.addEventListener("click", async (e) => {
      if (e.target.tagName === "A") {
        e.preventDefault();
        const courseId = parseInt(e.target.dataset.id);
        state.selectedCourseId = courseId;
        docManagementSection.style.display = "block"; // 顯示文件管理區塊

        renderCourses();
        // 同時載入任務和文件
        await Promise.all([loadTasks(courseId), loadDocuments(courseId)]);
      }
    });

    // ★ 新增：文件上傳輸入框變動事件
    documentUploadInput.addEventListener("change", () => {
      if (documentUploadInput.files.length > 0) {
        fileNameDisplay.textContent = documentUploadInput.files[0].name;
      } else {
        fileNameDisplay.textContent = "";
      }
    });

    // ★ 新增：文件上傳按鈕點擊事件
    uploadDocBtn.addEventListener("click", async () => {
      const file = documentUploadInput.files[0];
      if (!file || !state.selectedCourseId) {
        alert("請先選擇課程和一個要上傳的檔案。");
        return;
      }

      const formData = new FormData();
      formData.append("documentFile", file);

      try {
        uploadDocBtn.textContent = "上傳中...";
        uploadDocBtn.disabled = true;
        await fetchAPI(
          "POST",
          `/api/documents/upload/${state.selectedCourseId}`,
          formData
        );
        fileNameDisplay.textContent = "";
        documentUploadInput.value = ""; // 清空 file input
        await loadDocuments(state.selectedCourseId); // 重新整理文件列表
      } catch (error) {
        alert(`檔案上傳失敗: ${error.message}`);
      } finally {
        uploadDocBtn.textContent = "上傳文件";
        uploadDocBtn.disabled = false;
      }
    });

    // ★ 新增：AI 分析按鈕點擊事件
    analyzeBtn.addEventListener("click", async () => {
      if (!state.selectedCourseId) return;

      if (
        confirm(
          "確定要讓 AI 綜合分析此課程的所有文件嗎？這個過程可能需要一點時間。"
        )
      ) {
        try {
          analyzeBtn.textContent = "🧠 AI 分析中...";
          analyzeBtn.disabled = true;
          const result = await fetchAPI(
            "POST",
            `/api/analyze/course/${state.selectedCourseId}`
          );
          alert(result.message); // 顯示成功訊息
          await loadTasks(state.selectedCourseId); // 分析完後，重新整理任務列表
        } catch (error) {
          alert(`AI 分析失敗: ${error.message}`);
        } finally {
          analyzeBtn.textContent = "🚀 讓 AI 綜合分析所有文件";
          analyzeBtn.disabled = false;
        }
      }
    });

    // ... (其他事件監聽器不變)

    await loadCourses();
    // 初始隱藏文件管理區塊
    docManagementSection.style.display = "none";
  }

  // 執行初始化
  init();

  // 為了讓上面省略的程式碼能運作，補上之前已完成的函式
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
      taskCard.innerHTML = `<div class="task-card-header"><input type="checkbox" class="task-checkbox" data-task-id="${
        task.id
      }" ${task.completed ? "checked" : ""}><h3>${
        task.title
      }</h3><button class="btn-delete" data-task-id="${
        task.id
      }">×</button></div><p class="task-meta">截止日期：${
        task.deadline || "未設定"
      }</p><div class="task-time-info"><span>預計 ${
        task.estimatedTime || "-"
      } 分鐘 / 已花費 ${
        task.actualTime || 0
      } 分鐘</span><button class="btn-add-time" data-task-id="${
        task.id
      }">增加時間</button></div>`;
      taskListContainer.appendChild(taskCard);
    });
  }
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
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }
});
