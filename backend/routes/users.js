// backend/routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// --- POST /api/users/register ---
// 處理新使用者註冊
router.post("/register", async (req, res) => {
  const db = req.db;
  const { name, email, password } = req.body;

  // 1. 簡單的輸入驗證
  if (!name || !email || !password) {
    return res.status(400).json({ message: "請填寫所有必要欄位。" });
  }

  try {
    // 2. 檢查電子郵件是否已經存在
    const existingUser = await db.get("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);
    if (existingUser) {
      return res.status(409).json({ message: "此電子郵件已被註冊。" }); // 409 Conflict
    }

    // 3. 將密碼加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. 將新使用者存入資料庫
    const result = await db.run(
      "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    // 5. 回傳成功訊息 (不包含密碼)
    res.status(201).json({
      message: "使用者註冊成功！",
      userId: result.lastID, // 取得新插入的 user ID
      name: name,
      email: email,
    });
  } catch (error) {
    console.error("註冊時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤。" });
  }
});

module.exports = router;
