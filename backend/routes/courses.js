const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- GET /api/courses ---
// (此部分無變動)
router.get("/", auth, async (req, res) => {
  try {
    const db = req.db;
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
// (此部分無變動)
router.post("/", auth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "課程名稱為必填欄位。" });
  }
  try {
    const db = req.db;
    const result = await db.run(
      "INSERT INTO Groups (name, ownerId) VALUES (?, ?)",
      [name, req.user.id]
    );
    const newCourse = await db.get("SELECT * FROM Groups WHERE id = ?", [
      result.lastID,
    ]);
    res.status(201).json(newCourse);
  } catch (error) {
    console.error("新增課程時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- GET /api/courses/:courseId/tasks ---
// ★ 核心修改：加上 ORDER BY orderIndex ASC
router.get("/:courseId/tasks", auth, async (req, res) => {
  try {
    const db = req.db;
    const tasks = await db.all(
      "SELECT * FROM Tasks WHERE groupId = ? ORDER BY orderIndex ASC, id ASC",
      [req.params.courseId]
    );
    res.json(tasks);
  } catch (error) {
    console.error("獲取任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- POST /api/courses/:courseId/tasks ---
// (此部分無變動)
router.post("/:courseId/tasks", auth, async (req, res) => {
  const { title, deadline, estimatedTime } = req.body;
  if (!title) {
    return res.status(400).json({ message: "任務標題為必填欄位。" });
  }
  try {
    const db = req.db;
    const result = await db.run(
      "INSERT INTO Tasks (title, deadline, estimatedTime, groupId, ownerId) VALUES (?, ?, ?, ?, ?)",
      [
        title,
        deadline || null,
        estimatedTime || null,
        req.params.courseId,
        req.user.id,
      ]
    );
    const newTask = await db.get("SELECT * FROM Tasks WHERE id = ?", [
      result.lastID,
    ]);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("新增任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
