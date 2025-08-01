// backend/routes/home.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- GET /api/home/summary ---
// 獲取智慧首頁所需的所有摘要數據
router.get("/summary", auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.id;

  try {
    // 1. 取得課程總數
    const courseCountResult = await db.get(
      "SELECT COUNT(*) as count FROM Groups WHERE ownerId = ?",
      [userId]
    );
    const courseCount = courseCountResult.count;

    // 2. 取得今日到期的任務數
    const today = new Date().toISOString().split("T")[0]; // 格式：YYYY-MM-DD
    const tasksDueTodayResult = await db.get(
      `SELECT COUNT(*) as count FROM Tasks 
             WHERE ownerId = ? AND deadline = ? AND completed = 0`,
      [userId, today]
    );
    const tasksDueTodayCount = tasksDueTodayResult.count;

    // 3. 取得本週總學習時間 (分鐘)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const totalStudyTimeResult = await db.get(
      `SELECT SUM(actualTime) as total FROM Tasks 
             WHERE ownerId = ? AND completed = 1`, // 這裡可以擴充為只計算一週內的
      [userId]
    );
    const totalStudyTime = totalStudyTimeResult.total || 0;

    // 4. 打包所有數據並回傳
    res.json({
      courseCount,
      tasksDueTodayCount,
      totalStudyTime,
    });
  } catch (error) {
    console.error("獲取首頁摘要數據時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
