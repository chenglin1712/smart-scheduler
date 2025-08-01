// js/report.js (儀表板深化最終版)
document.addEventListener("DOMContentLoaded", () => {
  // ... (token 檢查, 登出邏輯, fetchAPI 函式保持不變)
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  }
  const spinner = document.getElementById("spinner-overlay");
  async function fetchAPI(url) {
    spinner.style.display = "flex";
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`http://localhost:5001${url}`, { headers });
      if (!response.ok) throw new Error("API 請求失敗");
      return response.json();
    } finally {
      spinner.style.display = "none";
    }
  }

  async function generateReports() {
    try {
      const [courses, tasks] = await Promise.all([
        fetchAPI("/api/courses"),
        fetchAPI("/api/tasks"),
      ]);
      if (courses.length > 0) {
        generateTasksPerCourseChart(courses, tasks);
        generateTimePerCourseChart(courses, tasks);
        generateEstimatedVsActualChart(tasks);
        generateTimeByTaskTypeChart(tasks);
      } else {
        document.querySelector(".report-container").innerHTML =
          '<p class="empty-list-text">沒有足夠的資料來生成圖表。</p>';
      }
    } catch (error) {
      console.error("生成報告失敗:", error);
      alert("生成報告失敗，請檢查主控台。");
    }
  }

  function generateTasksPerCourseChart(courses, tasks) {
    /* ... (此函式不變) ... */
  }
  function generateTimePerCourseChart(courses, tasks) {
    /* ... (此函式不變) ... */
  }

  // ★ 新增：繪製「預計 vs 實際時間」圖表
  function generateEstimatedVsActualChart(tasks) {
    const ctx = document
      .getElementById("estimatedVsActualChart")
      .getContext("2d");
    const completedTasks = tasks.filter(
      (t) => t.completed && t.estimatedTime > 0
    );

    if (completedTasks.length === 0) {
      document.getElementById(
        "estimatedVsActualChart"
      ).parentElement.innerHTML +=
        '<p class="empty-list-text">沒有已完成且包含預計時間的任務。</p>';
      return;
    }

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: completedTasks.map((t) => t.title),
        datasets: [
          {
            label: "預計時間 (分鐘)",
            data: completedTasks.map((t) => t.estimatedTime),
            backgroundColor: "rgba(54, 162, 235, 0.5)",
          },
          {
            label: "實際時間 (分鐘)",
            data: completedTasks.map((t) => t.actualTime),
            backgroundColor: "rgba(255, 99, 132, 0.5)",
          },
        ],
      },
      options: { indexAxis: "y" }, // 讓長條圖橫向顯示，方便閱讀標籤
    });
  }

  // ★ 新增：繪製「任務類型時間分佈」圖表
  function generateTimeByTaskTypeChart(tasks) {
    const ctx = document.getElementById("timeByTaskTypeChart").getContext("2d");
    const timeByType = {};

    tasks.forEach((task) => {
      const type = task.taskType || "其他";
      if (!timeByType[type]) {
        timeByType[type] = 0;
      }
      timeByType[type] += task.actualTime || 0;
    });

    const labels = Object.keys(timeByType);
    const data = Object.values(timeByType);

    if (labels.length === 0 || data.every((d) => d === 0)) {
      document.getElementById("timeByTaskTypeChart").parentElement.innerHTML +=
        '<p class="empty-list-text">尚無任何任務類型的時間紀錄。</p>';
      return;
    }

    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            label: "花費時間 (分鐘)",
            data: data,
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(255, 206, 86, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)",
              "rgba(255, 159, 64, 0.7)",
              "rgba(99, 255, 132, 0.7)",
            ],
          },
        ],
      },
    });
  }

  generateReports();

  // 為了方便你複製貼上，底下是另外兩個沒有變動的圖表函式
  function generateTasksPerCourseChart(courses, tasks) {
    const ctx = document.getElementById("tasksPerCourseChart").getContext("2d");
    const courseLabels = courses.map((c) => c.name);
    const taskCounts = courses.map(
      (c) => tasks.filter((t) => t.groupId === c.id).length
    );
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: courseLabels,
        datasets: [
          {
            label: "任務數量",
            data: taskCounts,
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } },
      },
    });
  }
  function generateTimePerCourseChart(courses, tasks) {
    const ctx = document.getElementById("timePerCourseChart").getContext("2d");
    const timeData = courses.map((course) => {
      return tasks
        .filter((task) => task.groupId === course.id)
        .reduce((total, task) => total + (task.actualTime || 0), 0);
    });
    const filteredData = courses
      .map((course, index) => ({ name: course.name, time: timeData[index] }))
      .filter((item) => item.time > 0);
    if (filteredData.length === 0) {
      document.getElementById("timePerCourseChart").parentElement.innerHTML +=
        '<p class="empty-list-text">所有課程皆無花費時間紀錄。</p>';
      return;
    }
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: filteredData.map((d) => d.name),
        datasets: [
          {
            label: "花費時間 (分鐘)",
            data: filteredData.map((d) => d.time),
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(255, 206, 86, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)",
              "rgba(255, 159, 64, 0.7)",
            ],
          },
        ],
      },
    });
  }
});
