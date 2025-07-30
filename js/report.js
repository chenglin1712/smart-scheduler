// js/report.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. 從 localStorage 取得我們需要的資料
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  // 2. 取得要繪製圖表的 canvas 元素
  const ctx = document.getElementById("tasksPerCourseChart").getContext("2d");

  // 3. 資料處理：計算每門課有多少個任務
  // 我們需要產生兩個陣列：一個是課程名稱 (標籤)，一個是對應的任務數量 (資料)

  const courseLabels = courses.map((course) => course.name);

  const taskCounts = courses.map((course) => {
    // 對於每一個課程，去 tasks 陣列中篩選出屬於它的任務，並計算數量
    return tasks.filter((task) => task.courseId === course.id).length;
  });

  // 4. 使用 Chart.js 建立圖表
  if (courses.length > 0) {
    new Chart(ctx, {
      type: "bar", // 圖表類型：長條圖
      data: {
        labels: courseLabels, // X 軸的標籤
        datasets: [
          {
            label: "任務數量", // 這個資料集的名稱
            data: taskCounts, // Y 軸的資料
            backgroundColor: [
              // 長條的顏色
              "rgba(255, 99, 132, 0.5)",
              "rgba(54, 162, 235, 0.5)",
              "rgba(255, 206, 86, 0.5)",
              "rgba(75, 192, 192, 0.5)",
              "rgba(153, 102, 255, 0.5)",
              "rgba(255, 159, 64, 0.5)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
              "rgba(255, 159, 64, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true, // Y 軸從 0 開始
            ticks: {
              // 確保 Y 軸刻度為整數
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false, // 不顯示頂部的圖例
          },
        },
      },
    });
  } else {
    // 如果沒有課程資料，顯示提示文字
    const chartCard = document.querySelector(".chart-card");
    chartCard.innerHTML =
      '<h2>各科任務數量分析</h2><p class="empty-list-text">沒有足夠的資料來生成圖表。</p>';
  }
});
