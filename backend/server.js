require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const PORT = process.env.PORT || 5001;

// 將所有啟動邏輯包在一個 async 函式中，確保執行的順序正確
async function startServer() {
  const app = express();

  // --- 中介軟體 (Middleware) ---
  app.use(cors());
  app.use(express.json());

  // 除錯用的日誌中介軟體，方便我們觀察請求
  app.use((req, res, next) => {
    console.log("--- 收到新的請求 ---");
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );
    console.log("請求標頭 (Headers):", req.headers);
    console.log("請求主體 (Body):", req.body);
    console.log("--------------------");
    next();
  });

  // 使用 try...catch 包裹，來捕捉啟動過程中的嚴重錯誤 (例如資料庫連線失敗)
  try {
    // 使用 await 確保在繼續之前，資料庫已成功連線
    const db = await open({
      filename: "./scheduler.db",
      driver: sqlite3.Database,
    });
    console.log("✅ 成功連接到 SQLite 資料庫。");

    // 將 db 物件附加到 req 上，讓後續的路由可以存取
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // --- 路由 (Routes) ---
    // 健康檢查路由
    app.get("/", (req, res) => {
      res.send("Scheduler Pro Backend is running!");
    });

    // 引入所有路由
    const userRoutes = require("./routes/users");
    const courseRoutes = require("./routes/courses");
    const taskRoutes = require("./routes/tasks");
    const documentRoutes = require("./routes/documents"); // 使用新的 document 路由
    const analyzeRoutes = require("./routes/analyze");

    // 使用所有路由
    app.use("/api/users", userRoutes);
    app.use("/api/courses", courseRoutes);
    app.use("/api/tasks", taskRoutes);
    app.use("/api/documents", documentRoutes); // 註冊新的 document 路由
    app.use("/api/analyze", analyzeRoutes);

    // --- 啟動伺服器 ---
    // 只有在所有設定都完成後，才啟動伺服器監聽
    app.listen(PORT, () => {
      console.log(`✅ 伺服器正在 http://localhost:${PORT} 上運行`);
    });
  } catch (error) {
    console.error("❌ 啟動伺服器失敗:", error);
  }
}

// 執行啟動函式
startServer();
