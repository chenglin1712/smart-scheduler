// backend/routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ★ 引入 jsonwebtoken
const router = express.Router();
const auth = require("../middleware/auth"); // ★ 引入 auth 中介軟體

// --- POST /api/users/register ---
// (你原本的註冊程式碼，保持不變)
router.post("/register", async (req, res) => {
  const db = req.db;
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "請填寫所有必要欄位。" });
  }

  try {
    const existingUser = await db.get("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);
    if (existingUser) {
      return res.status(409).json({ message: "此電子郵件已被註冊。" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "使用者註冊成功！",
      userId: result.lastID,
      name: name,
      email: email,
    });
  } catch (error) {
    console.error("註冊時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤。" });
  }
});

// ★★★ 新增的登入路由 ★★★
// --- POST /api/users/login ---
router.post("/login", async (req, res) => {
  const db = req.db;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "請填寫電子郵件和密碼。" });
  }

  try {
    // 1. 根據 email 在資料庫中尋找使用者
    const user = await db.get("SELECT * FROM Users WHERE email = ?", [email]);
    if (!user) {
      // 為安全起見，不要明確告知是「帳號錯誤」還是「密碼錯誤」
      return res.status(401).json({ message: "電子郵件或密碼錯誤。" });
    }

    // 2. 比較傳入的密碼和資料庫中加密過的密碼
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "電子郵件或密碼錯誤。" });
    }

    // 3. 密碼正確，產生 JWT
    const payload = {
      user: {
        id: user.id,
        name: user.name,
      },
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // 從 .env 檔案讀取密鑰
      { expiresIn: "1h" } // Token 有效期 1 小時
    );

    // 4. 回傳 token 給前端
    res.json({
      message: "登入成功！",
      token: token,
    });
  } catch (error) {
    console.error("登入時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤。" });
  }
});
// --- GET /api/users/me ---
// 這個路由會先經過 auth 中介軟體的檢查
router.get("/me", auth, async (req, res) => {
  try {
    // auth 中介軟體已經把 user ID 放在 req.user.id
    const db = req.db;
    const user = await db.get(
      "SELECT id, name, email FROM Users WHERE id = ?",
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: "找不到使用者。" });
    }

    res.json(user);
  } catch (error) {
    console.error("取得個人資料時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤。" });
  }
});

module.exports = router;
