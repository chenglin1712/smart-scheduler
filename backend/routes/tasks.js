const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- GET /api/tasks ---
// 獲取登入使用者的所有任務 (升級版：可接收日期範圍)
router.get("/", auth, async (req, res) => {
  const db = req.db;
  const { start, end } = req.query; // 從 URL 查詢參數中讀取 start 和 end

  try {
    // 基礎查詢語句
    let query = `SELECT * FROM Tasks WHERE groupId IN (SELECT id FROM Groups WHERE ownerId = ?)`;
    const params = [req.user.id];

    // 如果前端提供了 start 和 end 參數，就加入日期過濾條件
    if (start && end) {
      query += ` AND deadline BETWEEN ? AND ?`;
      params.push(start, end);
    }

    const tasks = await db.all(query, params);
    res.json(tasks);
  } catch (error) {
    console.error("獲取所有任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- PATCH /api/tasks/:taskId ---
// 更新一個任務 (此部分無變動)
router.patch("/:taskId", auth, async (req, res) => {
  const { completed, actualTime } = req.body;
  const { taskId } = req.params;

  try {
    const db = req.db;
    const fieldsToUpdate = {};
    if (typeof completed === "boolean") {
      fieldsToUpdate.completed = completed ? 1 : 0;
    }
    if (typeof actualTime === "number") {
      fieldsToUpdate.actualTime = actualTime;
    }
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: "沒有提供可更新的欄位。" });
    }
    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(fieldsToUpdate);
    await db.run(`UPDATE Tasks SET ${setClauses} WHERE id = ?`, [
      ...values,
      taskId,
    ]);
    const updatedTask = await db.get("SELECT * FROM Tasks WHERE id = ?", [
      taskId,
    ]);
    res.json(updatedTask);
  } catch (error) {
    // ★★★ 錯誤已修正：在這裡加上了遺失的 '{' ★★★
    console.error("更新任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- DELETE /api/tasks/:taskId ---
// 刪除一個任務 (此部分無變動)
router.delete("/:taskId", auth, async (req, res) => {
  const { taskId } = req.params;
  try {
    const db = req.db;
    await db.run("DELETE FROM Tasks WHERE id = ?", [taskId]);
    res.status(204).send();
  } catch (error) {
    console.error("刪除任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
