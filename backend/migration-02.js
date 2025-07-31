// backend/migration-02.js
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

// 建立一個新的 "Documents" 資料表
const CREATE_DOCUMENTS_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS Documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        courseId INTEGER NOT NULL,
        fileName TEXT NOT NULL,
        fileType TEXT,
        uploadDate TEXT NOT NULL,
        textContent TEXT,
        FOREIGN KEY (courseId) REFERENCES Groups(id)
    );
`;

async function runMigration() {
  console.log("正在執行資料庫遷移腳本 (migration-02)...");
  try {
    const db = await open({
      filename: "./scheduler.db",
      driver: sqlite3.Database,
    });

    await db.exec(CREATE_DOCUMENTS_TABLE_SQL);
    await db.close();
    console.log("✅ 成功建立 'Documents' 資料表。");
  } catch (error) {
    console.error("❌ 遷移失敗:", error);
  }
}

runMigration();
