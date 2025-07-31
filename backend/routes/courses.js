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

module.exports = router;
