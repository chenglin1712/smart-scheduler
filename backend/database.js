// backend/database.js
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

// SQL 指令：用來建立資料表的語法
// 我們使用 TEXT 作為 Primary Key，方便使用 UUID 或自訂 ID，但 INTEGER PRIMARY KEY AUTOINCREMENT 也是常見選擇
const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ownerId INTEGER NOT NULL,
        FOREIGN KEY (ownerId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS Tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        deadline TEXT,
        completed INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
        groupId INTEGER NOT NULL,
        assignedTo INTEGER,
        FOREIGN KEY (groupId) REFERENCES Groups(id),
        FOREIGN KEY (assignedTo) REFERENCES Users(id)
    );

    -- 這是「關聯表」，用來處理使用者和群組的多對多關係
    CREATE TABLE IF NOT EXISTS GroupMembers (
        userId INTEGER NOT NULL,
        groupId INTEGER NOT NULL,
        PRIMARY KEY (userId, groupId),
        FOREIGN KEY (userId) REFERENCES Users(id),
        FOREIGN KEY (groupId) REFERENCES Groups(id)
    );
`;

// 建立並初始化資料庫的非同步函式
async function setupDatabase() {
  try {
    console.log("正在設定資料庫...");
    // open 會開啟 (或建立) 資料庫檔案，並回傳一個 db 物件
    const db = await open({
      filename: "./scheduler.db", // 資料庫檔案名稱
      driver: sqlite3.Database,
    });

    // db.exec 可以執行沒有回傳結果的 SQL 指令 (例如 CREATE TABLE)
    await db.exec(CREATE_TABLE_SQL);
    await db.close();
    console.log('資料庫設定完成！檔案 "scheduler.db" 已建立/更新。');
  } catch (error) {
    console.error("設定資料庫時發生錯誤：", error);
  }
}

// 執行函式
setupDatabase();
