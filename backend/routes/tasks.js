const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// --- GET /api/tasks ---
// 獲取登入使用者的所有任務 (用於報告頁面)
router.get("/", auth, async (req, res) => {
  try {
    const db = req.db;
    // 使用 SQL 子查詢，找出 ownerId 是登入者的所有課程的 ID，再用這些 ID 去撈取所有相關的 tasks
    const tasks = await db.all(
      `SELECT * FROM Tasks WHERE groupId IN (SELECT id FROM Groups WHERE ownerId = ?)`,
      [req.user.id]
    );
    res.json(tasks);
  } catch (error) {
    console.error("獲取所有任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- PATCH /api/tasks/:taskId ---
// 更新一個任務 (例如：標記為完成/未完成、更新花費時間)
router.patch("/:taskId", auth, async (req, res) => {
  const { completed, actualTime } = req.body;
  const { taskId } = req.params;

  try {
    const db = req.db;

    // 根據傳入的欄位，動態產生 SQL 更新語句
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

    // TODO: 在真實世界中，你應該要先驗證這個 task 是否屬於登入的使用者
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
// 刪除一個任務
router.delete("/:taskId", auth, async (req, res) => {
  const { taskId } = req.params;
  try {
    const db = req.db;
    // TODO: 同上，真實世界需要權限驗證
    await db.run("DELETE FROM Tasks WHERE id = ?", [taskId]);
    res.status(204).send(); // 204 No Content 代表成功刪除，不需回傳內容
  } catch (error) {
    console.error("刪除任務時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

module.exports = router;
