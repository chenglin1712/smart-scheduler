// backend/routes/users.js (Profile 升級版)
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const auth = require("../middleware/auth");

// --- POST /api/users/register ---
// ★ 改造：註冊時可以接收新的 profile 欄位
router.post("/register", async (req, res) => {
  const db = req.db;
  // 1. 解構出新欄位
  const { name, email, password, university, department } = req.body;

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

    // 2. 在 INSERT 指令中加入新欄位
    const result = await db.run(
      "INSERT INTO Users (name, email, password, university, department) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, university || null, department || null]
    );

    const newUser = await db.get(
      "SELECT id, name, email, university, department FROM Users WHERE id = ?",
      [result.lastID]
    );

    res.status(201).json({
      message: "使用者註冊成功！",
      user: newUser,
    });
  } catch (error) {
    console.error("註冊時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤。" });
  }
});

// --- POST /api/users/login ---
// (此路由無變動)
router.post("/login", async (req, res) => {
  const db = req.db;
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "請填寫電子郵件和密碼。" });
  }
  try {
    const user = await db.get("SELECT * FROM Users WHERE email = ?", [email]);
    if (!user) {
      return res.status(401).json({ message: "電子郵件或密碼錯誤。" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "電子郵件或密碼錯誤。" });
    }
    const payload = {
      user: {
        id: user.id,
        name: user.name,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
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
// ★ 改造：讓此 API 回傳完整的個人資訊
router.get("/me", auth, async (req, res) => {
  try {
    const db = req.db;
    // 3. 在 SELECT 指令中加入新欄位
    const user = await db.get(
      "SELECT id, name, email, university, department, avatarUrl FROM Users WHERE id = ?",
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
