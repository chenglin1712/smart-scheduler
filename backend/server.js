// backend/server.js (偵錯日誌版本)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const PORT = process.env.PORT || 5001;

async function startServer() {
  const app = express();

  // --- 中介軟體 (Middleware) ---
  app.use(cors());
  app.use(express.json()); // 1. Express 先嘗試解析 JSON body

  // ★★★ 我們新增的偵錯日誌中介軟體 ★★★
  app.use((req, res, next) => {
    console.log("--- 收到新的請求 ---");
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );
    console.log("請求標頭 (Headers):", req.headers);
    console.log("請求主體 (Body):", req.body); // 2. 在這裡印出解析後的 body
    console.log("--------------------");
    next(); // 3. 將請求交給下一個處理程序 (我們的路由)
  });

  try {
    const db = await open({
      filename: "./scheduler.db",
      driver: sqlite3.Database,
    });
    console.log("成功連接到 SQLite 資料庫。");

    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // --- 路由 (Routes) ---
    app.get("/", (req, res) => {
      res.send("Scheduler Pro Backend is running!");
    });

    // 引入使用者路由
    const userRoutes = require("./routes/users");
    app.use("/api/users", userRoutes);

    // 引入課程路由
    const courseRoutes = require("./routes/courses");
    app.use("/api/courses", courseRoutes);

    // ★★★ 新增這兩行：引入並使用任務路由 ★★★
    const taskRoutes = require("./routes/tasks");
    app.use("/api/tasks", taskRoutes);

    const userRoutes = require("./routes/users");
    app.use("/api/users", userRoutes);

    // ★★★ 新增這兩行：引入並使用課程路由 ★★★
    const courseRoutes = require("./routes/courses");
    app.use("/api/courses", courseRoutes);

    // --- 啟動伺服器 ---
    app.listen(PORT, () => {
      console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
    });
  } catch (error) {
    console.error("啟動伺服器失敗:", error);
  }
}

startServer();
