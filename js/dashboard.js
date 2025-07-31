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
  const docManagementSection = document.getElementById(
    "document-management-section"
  );
  const documentList = document.getElementById("document-list");
  const documentUploadInput = document.getElementById("document-upload-input");
  const uploadDocBtn = document.getElementById("upload-doc-btn");
  const analyzeBtn = document.getElementById("analyze-btn");
  const fileNameDisplay = document.getElementById("file-name-display");
  const spinner = document.getElementById("spinner-overlay"); // ★ 新增 Spinner 元素

  // --- 2. 應用程式狀態 ---
  const state = {
    courses: [],
    tasks: [],
    documents: [],
    selectedCourseId: null,
    token: localStorage.getItem("token"),
  };

  // --- 3. API 請求函式 (★ 升級版，自動控制 Spinner) ★ ---
  async function fetchAPI(method, url, body = null) {
    spinner.style.display = "flex"; // 請求開始時，顯示 Spinner
    try {
      const headers = { Authorization: `Bearer ${state.token}` };
      const config = { method, headers };
      if (body) {
        if (body instanceof FormData) {
          config.body = body;
        } else {
          headers["Content-Type"] = "application/json";
          config.body = JSON.stringify(body);
        }
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
        throw new Error(errorData.message || "API 請求失敗");
      }
      return response.status === 204 ? null : response.json();
    } finally {
      spinner.style.display = "none"; // 請求結束後 (無論成功或失敗)，隱藏 Spinner
    }
  }

  // --- 4. 渲染函式 ---
  function renderCourses() {
    /* ... 無變動 ... */
  }
  function renderTasks() {
    /* ... 無變動 ... */
  }
  function renderDocuments() {
    /* ... 無變動 ... */
  }

  // --- 5. 資料處理函式 (★ 將 alert 改為 showToast) ★ ---
  async function loadCourses() {
    try {
      state.courses = await fetchAPI("GET", "/api/courses");
      renderCourses();
    } catch (error) {
      showToast(`載入課程失敗: ${error.message}`, "error");
    }
  }
  async function loadTasks(courseId) {
    try {
      state.tasks = await fetchAPI("GET", `/api/courses/${courseId}/tasks`);
      renderTasks();
    } catch (error) {
      showToast(`載入任務失敗: ${error.message}`, "error");
    }
  }
  async function loadDocuments(courseId) {
    try {
      state.documents = await fetchAPI(
        "GET",
        `/api/documents/course/${courseId}`
      );
      renderDocuments();
    } catch (error) {
      showToast(`載入文件列表失敗: ${error.message}`, "error");
    }
  }
  function openModal(type) {
    /* ... 無變動 ... */
  }
  function closeModal() {
    /* ... 無變動 ... */
  }
  async function handleSave() {
    const formType = modalTitle.textContent.includes("課程")
      ? "course"
      : "task";
    if (formType === "course") {
      const courseName = document.getElementById("course-name").value.trim();
      if (!courseName) return;
      try {
        const newCourse = await fetchAPI("POST", "/api/courses", {
          name: courseName,
        });
        await loadCourses();
        showToast(`課程 "${newCourse.name}" 新增成功！`, "success");
      } catch (error) {
        showToast(`儲存課程失敗: ${error.message}`, "error");
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
        renderCourses();
        showToast(`任務 "${title}" 新增成功！`, "success");
      } catch (error) {
        showToast(`儲存任務失敗: ${error.message}`, "error");
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

    courseList.addEventListener("click", async (e) => {
      if (e.target.tagName === "A") {
        e.preventDefault();
        const courseId = parseInt(e.target.dataset.id);
        state.selectedCourseId = courseId;
        docManagementSection.style.display = "block";
        renderCourses();
        await Promise.all([loadTasks(courseId), loadDocuments(courseId)]);
      }
    });

    documentUploadInput.addEventListener("change", () => {
      if (documentUploadInput.files.length > 0) {
        fileNameDisplay.textContent = documentUploadInput.files[0].name;
        uploadDocBtn.disabled = false;
      } else {
        fileNameDisplay.textContent = "";
        uploadDocBtn.disabled = true;
      }
    });

    uploadDocBtn.addEventListener("click", async () => {
      const file = documentUploadInput.files[0];
      if (!file || !state.selectedCourseId) {
        showToast("請先選擇課程和一個要上傳的檔案。", "error");
        return;
      }
      const formData = new FormData();
      formData.append("documentFile", file);
      try {
        uploadDocBtn.textContent = "上傳中...";
        uploadDocBtn.disabled = true;
        const result = await fetchAPI(
          "POST",
          `/api/documents/upload/${state.selectedCourseId}`,
          formData
        );
        showToast(result.message, "success");
        fileNameDisplay.textContent = "";
        documentUploadInput.value = "";
        await loadDocuments(state.selectedCourseId);
      } catch (error) {
        showToast(`檔案上傳失敗: ${error.message}`, "error");
      } finally {
        uploadDocBtn.textContent = "上傳文件";
        uploadDocBtn.disabled = true;
      }
    });

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
          showToast(result.message, "success");
          await loadTasks(state.selectedCourseId);
        } catch (error) {
          showToast(`AI 分析失敗: ${error.message}`, "error");
        } finally {
          analyzeBtn.textContent = "🚀 讓 AI 綜合分析所有文件";
          analyzeBtn.disabled = false;
        }
      }
    });

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
          showToast(
            isCompleted ? "任務已標示為完成！" : "任務已恢復為未完成。",
            "success"
          );
        } catch (error) {
          showToast(`更新任務失敗: ${error.message}`, "error");
          target.checked = !target.checked;
        }
      }
      if (target.classList.contains("btn-delete")) {
        if (confirm("確定要刪除這個任務嗎？")) {
          try {
            await fetchAPI("DELETE", `/api/tasks/${taskId}`);
            await loadTasks(state.selectedCourseId);
            renderCourses();
            showToast("任務刪除成功！", "success");
          } catch (error) {
            showToast(`刪除任務失敗: ${error.message}`, "error");
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
          showToast(`成功增加 ${timeToAdd} 分鐘！`, "success");
        } catch (error) {
          showToast(`更新時間失敗: ${error.message}`, "error");
        }
      }
    });

    await loadCourses();
    docManagementSection.style.display = "none";
    renderTasks();
  }

  init();

  // 為了可讀性，將重複的函式定義刪除，因為它們已經在上面定義過了
});
