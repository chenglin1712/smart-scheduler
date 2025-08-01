document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DOM 元素 ---
  const courseList = document.getElementById("course-list"),
    taskListContainer = document.getElementById("task-list-container"),
    currentCourseTitle = document.getElementById("current-course-title"),
    addCourseBtn = document.getElementById("add-course-btn"),
    addTaskBtn = document.getElementById("add-task-btn"),
    modal = document.getElementById("modal"),
    modalTitle = document.getElementById("modal-title"),
    modalForm = document.getElementById("modal-form"),
    logoutButton = document.getElementById("logout-btn"),
    docManagementSection = document.getElementById(
      "document-management-section"
    ),
    documentList = document.getElementById("document-list"),
    documentUploadInput = document.getElementById("document-upload-input"),
    uploadDocBtn = document.getElementById("upload-doc-btn"),
    analyzeBtn = document.getElementById("analyze-btn"),
    fileNameDisplay = document.getElementById("file-name-display"),
    spinner = document.getElementById("spinner-overlay"),
    viewSwitcher = document.getElementById("view-switcher"),
    listViewBtn = document.getElementById("list-view-btn"),
    calendarViewBtn = document.getElementById("calendar-view-btn"),
    listViewContainer = document.getElementById("list-view-container"),
    calendarViewContainer = document.getElementById("calendar-view-container"),
    summarizeBtn = document.getElementById("summarize-btn");
  const quizBtn = document.getElementById("quiz-btn"); // ★ 新增考卷按鈕元素
  let calendar,
    sortableInstance = null;

  // --- 2. 應用程式狀態 ---
  const state = {
    courses: [],
    tasks: [],
    documents: [],
    selectedCourseId: null,
    token: localStorage.getItem("token"),
    currentView: "list",
  };

  // --- 3. API 請求函式 ---
  async function fetchAPI(method, url, body = null) {
    spinner.style.display = "flex";
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
      spinner.style.display = "none";
    }
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
    }
    tasksForCourse.forEach((task) => {
      const taskCard = document.createElement("div");
      taskCard.className = `task-card ${task.completed ? "completed" : ""}`;
      taskCard.dataset.id = task.id;
      taskCard.dataset.actualTime = task.actualTime || 0;
      let deadlineStatusHTML = "";
      if (task.deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(
          (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24)
        );
        if (!task.completed && diffDays < 0) {
          deadlineStatusHTML = `<span class="deadline-status status-danger">已過期</span>`;
        } else if (!task.completed && diffDays <= 3) {
          deadlineStatusHTML = `<span class="deadline-status status-warning">即將到期</span>`;
        }
      }
      taskCard.innerHTML = `<div class="task-card-header"><input type="checkbox" class="task-checkbox" data-task-id="${
        task.id
      }" ${task.completed ? "checked" : ""}><h3>${
        task.title
      }</h3><button class="btn-delete" data-task-id="${
        task.id
      }">×</button></div><p class="task-meta"><span>截止日期：${
        task.deadline || "未設定"
      }</span>${deadlineStatusHTML}</p><div class="task-time-info"><span>預計 ${
        task.estimatedTime || "-"
      } 分鐘 / 已花費 ${
        task.actualTime || 0
      } 分鐘</span><button class="btn-add-time" data-task-id="${
        task.id
      }">增加時間</button></div>`;
      taskListContainer.appendChild(taskCard);
    });
    initSortable();
  }
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

  // --- 5. 資料處理與互動函式 ---
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
    modalForm.innerHTML = "";
    if (type === "course") {
      modalTitle.textContent = "新增課程";
      modalForm.innerHTML = `<div class="form-group"><label for="course-name">課程名稱</label><input type="text" id="course-name" required></div>`;
    } else if (type === "task") {
      modalTitle.textContent = "新增任務";
      modalForm.innerHTML = `<div class="form-group"><label for="task-title">任務標題</label><input type="text" id="task-title" required></div><div class="form-group"><label for="task-type">任務類型</label><select id="task-type" class="form-input"><option value="作業">作業</option><option value="報告">報告</option><option value="複習">複習</option><option value="小考">小考</option><option value="期中考">期中考</option><option value="期末考">期末考</option><option value="其他">其他</option></select></div><div class="form-group"><label for="task-deadline">截止日期</label><input type="date" id="task-deadline"></div><div class="form-group"><label for="task-estimated-time">預計花費時間 (分鐘)</label><input type="number" id="task-estimated-time" min="0"></div>`;
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
      const taskType = document.getElementById("task-type").value;
      if (!title) return;
      try {
        await fetchAPI("POST", `/api/courses/${state.selectedCourseId}/tasks`, {
          title,
          deadline,
          estimatedTime,
          taskType,
        });
        await loadTasks(state.selectedCourseId);
        renderCourses();
        showToast(`任務 "${title}" 新增成功！`, "success");
        calendar.refetchEvents();
      } catch (error) {
        showToast(`儲存任務失敗: ${error.message}`, "error");
      }
    }
    closeModal();
  }
  function initSortable() {
    if (sortableInstance) {
      sortableInstance.destroy();
    }
    sortableInstance = new Sortable(taskListContainer, {
      animation: 150,
      ghostClass: "sortable-ghost",
      onEnd: async function (evt) {
        evt.preventDefault();
        const taskCards = Array.from(taskListContainer.children);
        const orderedTaskIds = taskCards.map((card) => card.dataset.id);
        try {
          await fetchAPI("POST", "/api/tasks/reorder", { orderedTaskIds });
          showToast("任務順序已儲存！", "success");
        } catch (error) {
          showToast(`儲存順序失敗: ${error.message}`, "error");
          loadTasks(state.selectedCourseId);
        }
      },
    });
  }
  function showSummaryInModal(summaryText) {
    modalTitle.textContent = "課程重點摘要";
    const summaryContent = document.createElement("div");
    summaryContent.className = "summary-content";
    summaryContent.innerHTML = marked.parse(summaryText);
    modalForm.innerHTML = "";
    modalForm.appendChild(summaryContent);
    const modalActions = modal.querySelector(".modal-actions");
    modalActions.innerHTML = `<button id="modal-export-btn" class="btn btn-secondary">匯出成 .md</button><button id="modal-close-btn" class="btn btn-primary">關閉</button>`;
    document
      .getElementById("modal-close-btn")
      .addEventListener("click", closeModalAndRestoreButtons);
    document
      .getElementById("modal-export-btn")
      .addEventListener("click", () => {
        const courseName =
          state.courses.find((c) => c.id === state.selectedCourseId)?.name ||
          "課程";
        const blob = new Blob([summaryText], {
          type: "text/markdown;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${courseName}_重點摘要.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("摘要已匯出！", "success");
      });
    modal.classList.add("show");
  }
  function closeModalAndRestoreButtons() {
    closeModal();
    const modalActions = modal.querySelector(".modal-actions");
    modalActions.innerHTML = `<button id="modal-cancel-btn" class="btn btn-secondary">取消</button><button id="modal-save-btn" class="btn btn-primary">儲存</button>`;
    modal
      .querySelector("#modal-cancel-btn")
      .addEventListener("click", closeModal);
    modal
      .querySelector("#modal-save-btn")
      .addEventListener("click", handleSave);
  }

  // ★ 新增：一個用來隨機打亂陣列的輔助函式
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ★ 新增：顯示互動式考卷的函式
  function showQuizInModal(quizData) {
    let currentQuestionIndex = 0;
    let userAnswers = [];

    function renderQuestion() {
      const question = quizData.questions[currentQuestionIndex];
      const shuffledOptions = shuffleArray([...question.answerOptions]);
      question.shuffledOptions = shuffledOptions;
      modalTitle.textContent = `${quizData.title} (${
        currentQuestionIndex + 1
      }/${quizData.questions.length})`;
      let optionsHTML = '<div class="quiz-options">';
      shuffledOptions.forEach((option) => {
        optionsHTML += `<button class="quiz-option btn" data-original-text="${option.text}">${option.text}</button>`;
      });
      optionsHTML += "</div>";
      modalForm.innerHTML = `<div class="quiz-question">${question.question}</div>${optionsHTML}<div class="quiz-hint">💡 提示：${question.hint}</div>`;
      const modalActions = modal.querySelector(".modal-actions");
      modalActions.innerHTML =
        '<button id="modal-close-btn" class="btn btn-secondary">結束測驗</button>';
      document
        .getElementById("modal-close-btn")
        .addEventListener("click", closeModalAndRestoreButtons);
      modalForm.querySelectorAll(".quiz-option").forEach((button) => {
        button.addEventListener("click", handleAnswer);
      });
    }

    function handleAnswer(event) {
      const selectedText = event.target.dataset.originalText;
      const question = quizData.questions[currentQuestionIndex];
      const selectedOption = question.answerOptions.find(
        (opt) => opt.text === selectedText
      );
      userAnswers[currentQuestionIndex] = selectedOption;
      const optionButtons = modalForm.querySelectorAll(".quiz-option");
      question.shuffledOptions.forEach((option, index) => {
        optionButtons[index].disabled = true;
        let rationaleDiv = document.createElement("div");
        rationaleDiv.className = "quiz-rationale";
        rationaleDiv.textContent = option.rationale;
        if (option.isCorrect) {
          optionButtons[index].classList.add("correct");
        } else {
          optionButtons[index].classList.add("incorrect");
        }
        optionButtons[index].after(rationaleDiv);
      });
      const modalActions = modal.querySelector(".modal-actions");
      if (currentQuestionIndex < quizData.questions.length - 1) {
        modalActions.innerHTML =
          '<button id="next-question-btn" class="btn btn-primary">下一題</button>';
        document
          .getElementById("next-question-btn")
          .addEventListener("click", () => {
            currentQuestionIndex++;
            renderQuestion();
          });
      } else {
        showQuizResult();
      }
    }

    function showQuizResult() {
      let correctCount = 0;
      quizData.questions.forEach((q, i) => {
        if (userAnswers[i]?.isCorrect) {
          correctCount++;
        }
      });
      const score = (correctCount / quizData.questions.length) * 100;
      modalTitle.textContent = "測驗結果";
      let resultHTML = `<div class="quiz-result">你答對了 ${correctCount} / ${
        quizData.questions.length
      } 題！得分：${score.toFixed(0)} 分</div><hr>`;
      resultHTML += `<div id="printable-quiz">`;
      quizData.questions.forEach((q, i) => {
        resultHTML += `<div class="printable-question-block">`;
        resultHTML += `<p><strong>${i + 1}. ${q.question}</strong></p>`;
        resultHTML += `<ul>`;
        q.answerOptions.forEach((opt) => {
          let className = "";
          if (opt.isCorrect) className = "correct-answer";
          else if (
            userAnswers[i]?.text === opt.text &&
            !userAnswers[i]?.isCorrect
          )
            className = "wrong-answer";
          resultHTML += `<li class="${className}">${opt.text}</li>`;
        });
        resultHTML += `</ul>`;
        resultHTML += `<p class="printable-user-answer">你的答案：${
          userAnswers[i]?.text || "未作答"
        } (${userAnswers[i]?.isCorrect ? "正確" : "錯誤"})</p>`;
        resultHTML += `</div>`;
      });
      resultHTML += `</div>`;
      modalForm.innerHTML = resultHTML;
      const modalActions = modal.querySelector(".modal-actions");
      modalActions.innerHTML = `<button id="print-quiz-btn" class="btn btn-secondary">列印/下載 PDF</button><button id="modal-close-btn" class="btn btn-primary">關閉</button>`;
      document
        .getElementById("modal-close-btn")
        .addEventListener("click", closeModalAndRestoreButtons);
      document
        .getElementById("print-quiz-btn")
        .addEventListener("click", () => {
          window.print();
        });
    }
    renderQuestion();
    modal.classList.add("show");
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
    calendar = new FullCalendar.Calendar(calendarViewContainer, {
      initialView: "dayGridMonth",
      locale: "zh-tw",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listWeek",
      },
      events: async function (fetchInfo, successCallback, failureCallback) {
        try {
          const start = fetchInfo.start.toISOString().split("T")[0];
          const end = fetchInfo.end.toISOString().split("T")[0];
          const allTasks = await fetchAPI(
            "GET",
            `/api/tasks?start=${start}&end=${end}`
          );
          const events = allTasks
            .filter((task) => task.deadline)
            .map((task) => ({
              id: task.id,
              title: task.title,
              start: task.deadline,
              allDay: true,
              backgroundColor: task.completed ? "#22c55e" : "#6366f1",
              borderColor: task.completed ? "#16a34a" : "#4f46e5",
            }));
          successCallback(events);
        } catch (error) {
          showToast(`載入日曆事件失敗: ${error.message}`, "error");
          failureCallback(error);
        }
      },
    });

    // --- 綁定所有事件監聽器 ---
    listViewBtn.addEventListener("click", () => {
      state.currentView = "list";
      listViewContainer.style.display = "block";
      calendarViewContainer.style.display = "none";
      listViewBtn.classList.add("active");
      calendarViewBtn.classList.remove("active");
    });
    calendarViewBtn.addEventListener("click", () => {
      state.currentView = "calendar";
      listViewContainer.style.display = "none";
      calendarViewContainer.style.display = "block";
      listViewBtn.classList.remove("active");
      calendarViewBtn.classList.add("active");
      calendar.render();
    });
    courseList.addEventListener("click", async (e) => {
      if (e.target.tagName === "A") {
        e.preventDefault();
        const courseId = parseInt(e.target.dataset.id);
        state.selectedCourseId = courseId;
        docManagementSection.style.display = "block";
        viewSwitcher.style.display = "flex";
        renderCourses();
        await Promise.all([loadTasks(courseId), loadDocuments(courseId)]);
        calendar.refetchEvents();
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
          showToast(isCompleted ? "任務完成" : "任務標為未完成", "success");
          calendar.refetchEvents();
        } catch (error) {
          showToast(`更新失敗: ${error.message}`, "error");
          target.checked = !target.checked;
        }
      }
      if (target.classList.contains("btn-delete")) {
        if (confirm("確定要刪除這個任務嗎？")) {
          try {
            await fetchAPI("DELETE", `/api/tasks/${taskId}`);
            await loadTasks(state.selectedCourseId);
            renderCourses();
            showToast("任務刪除成功", "success");
            calendar.refetchEvents();
          } catch (error) {
            showToast(`刪除失敗: ${error.message}`, "error");
          }
        }
      }
      if (target.classList.contains("btn-add-time")) {
        const timeStr = prompt("分鐘數：", "30");
        const timeToAdd = parseInt(timeStr);
        if (timeStr === null || isNaN(timeToAdd) || timeToAdd < 0) return;
        const card = target.closest(".task-card");
        const current = parseInt(card.dataset.actualTime) || 0;
        const newActual = current + timeToAdd;
        try {
          await fetchAPI("PATCH", `/api/tasks/${taskId}`, {
            actualTime: newActual,
          });
          await loadTasks(state.selectedCourseId);
          showToast(`成功增加 ${timeToAdd} 分鐘`, "success");
          calendar.refetchEvents();
        } catch (error) {
          showToast(`更新時間失敗: ${error.message}`, "error");
        }
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
    document
      .getElementById("modal-cancel-btn")
      .addEventListener("click", closeModal);
    document
      .getElementById("modal-save-btn")
      .addEventListener("click", handleSave);
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
          calendar.refetchEvents();
        } catch (error) {
          showToast(`AI 分析失敗: ${error.message}`, "error");
        } finally {
          analyzeBtn.textContent = "🚀 讓 AI 分析任務";
          analyzeBtn.disabled = false;
        }
      }
    });
    summarizeBtn.addEventListener("click", async () => {
      if (!state.selectedCourseId) return;
      if (state.documents.length === 0) {
        showToast("請先上傳至少一份文件才能產生摘要。", "error");
        return;
      }
      try {
        const result = await fetchAPI(
          "POST",
          `/api/analyze/course/${state.selectedCourseId}/summarize`
        );
        showSummaryInModal(result.summary);
      } catch (error) {
        showToast(`摘要產生失敗: ${error.message}`, "error");
      }
    });

    quizBtn.addEventListener("click", async () => {
      if (!state.selectedCourseId) return;
      if (state.documents.length === 0) {
        showToast("請先上傳至少一份文件才能產生測驗。", "error");
        return;
      }
      try {
        const result = await fetchAPI(
          "POST",
          `/api/analyze/course/${state.selectedCourseId}/quiz`
        );
        showQuizInModal(result.quiz);
      } catch (error) {
        showToast(`測驗產生失敗: ${error.message}`, "error");
      }
    });

    // --- 初始載入 ---
    await loadCourses();
    docManagementSection.style.display = "none";
    viewSwitcher.style.display = "none";
    renderTasks();
  }

  init();
});
