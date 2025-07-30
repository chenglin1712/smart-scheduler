// js/gpa.js

// 等待整個 HTML 文件都載入完成後再執行
document.addEventListener("DOMContentLoaded", () => {
  // 1. 抓取我們需要的 HTML 元素
  const gpaForm = document.getElementById("gpa-form");
  const courseListContainer = document.querySelector(".course-grade-list");
  const gpaValueDisplay = document.querySelector(".gpa-value");

  // 2. 初始化資料：嘗試從 localStorage 讀取，如果沒有就用空陣列
  let courses = JSON.parse(localStorage.getItem("gpaCourses")) || [];

  // 3. 核心功能：計算 GPA
  function calculateGPA() {
    if (courses.length === 0) {
      gpaValueDisplay.textContent = "N/A";
      return;
    }

    let totalCredits = 0;
    let totalPoints = 0;

    courses.forEach((course) => {
      // 假設4.0制，90+ = 4.0, 80-89 = 3.0 ... 60-69 = 1.0
      // 這裡的轉換規則可以依學校規定自訂
      let gradePoint = 0;
      if (course.grade >= 90) gradePoint = 4.0;
      else if (course.grade >= 80) gradePoint = 3.0;
      else if (course.grade >= 70) gradePoint = 2.0;
      else if (course.grade >= 60) gradePoint = 1.0;

      totalCredits += course.credits;
      totalPoints += course.credits * gradePoint;
    });

    const gpa = totalPoints / totalCredits;
    // toFixed(2) 將結果四捨五入到小數點後兩位
    gpaValueDisplay.textContent = gpa.toFixed(2);
  }

  // 4. 核心功能：渲染課程列表到畫面上
  function renderCourses() {
    // 先清空目前的列表，避免重複添加
    courseListContainer.innerHTML = "";

    if (courses.length === 0) {
      courseListContainer.innerHTML =
        '<p class="empty-list-text">尚未新增任何課程成績。</p>';
      return;
    }

    courses.forEach((course, index) => {
      const courseItem = document.createElement("div");
      courseItem.classList.add("course-item");
      courseItem.innerHTML = `
                <span>${course.name} (${course.credits}學分)</span>
                <div class="course-item-actions">
                    <span>成績: ${course.grade}</span>
                    <button class="btn-delete" data-index="${index}">×</button>
                </div>
            `;
      courseListContainer.appendChild(courseItem);
    });
  }

  // 5. 核心功能：儲存資料到 localStorage
  function saveCourses() {
    localStorage.setItem("gpaCourses", JSON.stringify(courses));
  }

  // 6. 設定事件監聽器
  gpaForm.addEventListener("submit", (event) => {
    // 防止表單提交時頁面重整
    event.preventDefault();

    // 從表單抓取使用者輸入的值
    const courseName = document.getElementById("course-name").value;
    const credits = parseFloat(document.getElementById("credits").value);
    const grade = parseFloat(document.getElementById("grade").value);

    // 簡單的驗證
    if (courseName && !isNaN(credits) && !isNaN(grade)) {
      courses.push({ name: courseName, credits: credits, grade: grade });

      saveCourses();
      renderCourses();
      calculateGPA();

      // 清空表單以便下次輸入
      gpaForm.reset();
    } else {
      alert("請確保所有欄位都已正確填寫！");
    }
  });

  courseListContainer.addEventListener("click", (event) => {
    // 利用事件委派，只監聽整個容器的點擊事件
    if (event.target.classList.contains("btn-delete")) {
      const indexToDelete = parseInt(event.target.getAttribute("data-index"));
      // 從陣列中移除該項
      courses.splice(indexToDelete, 1);

      saveCourses();
      renderCourses();
      calculateGPA();
    }
  });

  // 7. 初始載入：頁面打開時，立即渲染已儲存的課程並計算GPA
  renderCourses();
  calculateGPA();
});
