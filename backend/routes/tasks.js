// backend/routes/tasks.js (正確版本)
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- PATCH /api/tasks/:taskId ---
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
    console.error("更新任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- DELETE /api/tasks/:taskId ---
// ★★★ 請特別確認這一段 router.delete(...) 完整無誤 ★★★
router.delete("/:taskId", auth, async (req, res) => {
  const { taskId } = req.params;
  try {
    const db = req.db;
    await db.run("DELETE FROM Tasks WHERE id = ?", [taskId]);
    res.status(204).send(); // 成功時回傳 204
  } catch (error) {
    console.error("刪除任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
