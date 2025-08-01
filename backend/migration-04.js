// backend/migration-04.js
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const MIGRATION_SQL = `
    ALTER TABLE Tasks ADD COLUMN taskType TEXT;
`;

async function runMigration() {
  console.log("正在執行資料庫遷移腳本 (migration-04)...");
  try {
    const db = await open({
      filename: "./scheduler.db",
      driver: sqlite3.Database,
    });
    await db.exec(MIGRATION_SQL);
    await db.close();
    console.log("✅ 成功為 Tasks 資料表加入 taskType 欄位。");
  } catch (error) {
    if (error.message.includes("duplicate column name")) {
      console.log("⚠️ 欄位已存在，無需重複加入。");
    } else {
      console.error("❌ 遷移失敗:", error);
    }
  }
}
runMigration();
