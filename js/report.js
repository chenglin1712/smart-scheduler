// js/report.js (全新版本)
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  // 登出按鈕邏輯
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  }

  async function fetchAPI(url) {
    const headers = { Authorization: `Bearer ${token}` };
    const response = await fetch(`http://localhost:5001${url}`, { headers });
    if (!response.ok) throw new Error("API 請求失敗");
    return response.json();
  }

  async function generateReports() {
    try {
      // 平行發出兩個 API 請求，效率更高
      const [courses, tasks] = await Promise.all([
        fetchAPI("/api/courses"),
        fetchAPI("/api/tasks"), // 呼叫我們的新 API
      ]);

      if (courses.length > 0) {
        generateTasksPerCourseChart(courses, tasks);
        generateTimePerCourseChart(courses, tasks);
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
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
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

    // 資料處理：計算每門課的總花費時間
    const timeData = courses.map((course) => {
      return tasks
        .filter((task) => task.groupId === course.id)
        .reduce((total, task) => total + (task.actualTime || 0), 0);
    });

    // 過濾掉沒有花費時間的課程，避免圖表太空
    const filteredData = courses
      .map((course, index) => ({
        name: course.name,
        time: timeData[index],
      }))
      .filter((item) => item.time > 0);

    if (filteredData.length === 0) {
      document.getElementById("timePerCourseChart").parentElement.innerHTML +=
        '<p class="empty-list-text">所有課程皆無花費時間紀錄。</p>';
      return;
    }

    new Chart(ctx, {
      type: "pie", // 圖表類型：圓餅圖
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

  generateReports();
});
