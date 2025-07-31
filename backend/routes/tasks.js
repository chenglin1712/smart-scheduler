const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- GET /api/tasks ---
// (此部分無變動)
router.get("/", auth, async (req, res) => {
  const db = req.db;
  const { start, end } = req.query;

  try {
    let query = `SELECT * FROM Tasks WHERE groupId IN (SELECT id FROM Groups WHERE ownerId = ?)`;
    const params = [req.user.id];

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
// (此部分無變動)
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
// (此部分無變動)
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

// ★★★ 核心修改：加入儲存任務排序的 API ★★★
// --- POST /api/tasks/reorder ---
router.post("/reorder", auth, async (req, res) => {
  const { orderedTaskIds } = req.body;
  if (!Array.isArray(orderedTaskIds)) {
    return res
      .status(400)
      .json({ message: "請求格式錯誤，需要一個任務 ID 的陣列。" });
  }

  const db = req.db;
  try {
    // 使用資料庫交易，確保所有更新要嘛全部成功，要嘛全部失敗
    await db.exec("BEGIN TRANSACTION");

    await Promise.all(
      orderedTaskIds.map((taskId, index) => {
        return db.run("UPDATE Tasks SET orderIndex = ? WHERE id = ?", [
          index,
          taskId,
        ]);
      })
    );

    await db.exec("COMMIT");

    res.json({ message: "任務順序更新成功！" });
  } catch (error) {
    await db.exec("ROLLBACK"); // 如果出錯，撤銷所有變更
    console.error("更新任務順序時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
