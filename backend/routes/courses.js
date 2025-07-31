// backend/routes/courses.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // 引入我們的保全

// --- GET /api/courses ---
// 取得登入使用者的所有課程
router.get("/", auth, async (req, res) => {
  try {
    const db = req.db;
    // 從 auth 中介軟體中取得使用者 ID，並查詢 Groups(課程) 資料表
    const courses = await db.all("SELECT * FROM Groups WHERE ownerId = ?", [
      req.user.id,
    ]);
    res.json(courses);
  } catch (error) {
    console.error("獲取課程時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- POST /api/courses ---
// 為登入使用者新增一門課程
router.post("/", auth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "課程名稱為必填欄位。" });
  }

  try {
    const db = req.db;
    const result = await db.run(
      "INSERT INTO Groups (name, ownerId) VALUES (?, ?)",
      [name, req.user.id] // ownerId 來自登入者的 token
    );

    // 回傳剛剛新增的課程資料
    const newCourse = await db.get("SELECT * FROM Groups WHERE id = ?", [
      result.lastID,
    ]);
    res.status(201).json(newCourse);
  } catch (error) {
    console.error("新增課程時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// ★★★ 新增：獲取特定課程下的所有任務 ★★★
// --- GET /api/courses/:courseId/tasks ---
router.get("/:courseId/tasks", auth, async (req, res) => {
  try {
    const db = req.db;
    // 透過 URL 傳入的 courseId 來查詢 Tasks 資料表
    const tasks = await db.all("SELECT * FROM Tasks WHERE groupId = ?", [
      req.params.courseId,
    ]);
    res.json(tasks);
  } catch (error) {
    console.error("獲取任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// ★★★ 新增：為特定課程新增一個任務 ★★★
// --- POST /api/courses/:courseId/tasks ---
router.post("/:courseId/tasks", auth, async (req, res) => {
  // ★ 新增 estimatedTime 的解構
  const { title, deadline, estimatedTime } = req.body;
  if (!title) {
    return res.status(400).json({ message: "任務標題為必填欄位。" });
  }

  try {
    const db = req.db;
    const result = await db.run(
      // ★ 在 INSERT 指令中加入 estimatedTime
      "INSERT INTO Tasks (title, deadline, estimatedTime, groupId) VALUES (?, ?, ?, ?)",
      [title, deadline || null, estimatedTime || null, req.params.courseId]
    );

    const newTask = await db.get("SELECT * FROM Tasks WHERE id = ?", [
      result.lastID,
    ]);
    res.status(201).json(newTask);
  } catch (error) {
    //... (錯誤處理不變)
    console.error("新增任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
