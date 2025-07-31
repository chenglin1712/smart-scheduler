// backend/routes/documents.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const auth = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- POST /api/documents/upload/:courseId ---
// 上傳一個文件，解析後存入 Documents 資料表
router.post(
  "/upload/:courseId",
  auth,
  upload.single("documentFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "沒有上傳任何檔案。" });
    }

    const { courseId } = req.params;
    const db = req.db;

    try {
      // 1. 解析 PDF 取得純文字
      const data = await pdfParse(req.file.buffer);
      const textContent = data.text;

      // 2. 將文件資訊和文字內容存入新的 Documents 資料表
      const result = await db.run(
        `INSERT INTO Documents (courseId, fileName, fileType, uploadDate, textContent)
             VALUES (?, ?, ?, ?, ?)`,
        [
          courseId,
          req.file.originalname,
          req.file.mimetype,
          new Date().toISOString(),
          textContent,
        ]
      );

      const newDocument = await db.get(
        "SELECT id, fileName, uploadDate FROM Documents WHERE id = ?",
        [result.lastID]
      );

      res.status(201).json({
        message: "✅ 檔案上傳並解析成功！",
        document: newDocument,
      });
    } catch (error) {
      console.error("❌ 處理文件時發生錯誤:", error);
      res.status(500).json({ message: "處理文件失敗。" });
    }
  }
);

// --- GET /api/documents/course/:courseId ---
// 獲取某個課程底下已上傳的所有文件列表
router.get("/course/:courseId", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;
  try {
    const documents = await db.all(
      "SELECT id, fileName, uploadDate FROM Documents WHERE courseId = ?",
      [courseId]
    );
    res.json(documents);
  } catch (error) {
    console.error("❌ 獲取文件列表時發生錯誤:", error);
    res.status(500).json({ message: "獲取文件列表失敗。" });
  }
});

module.exports = router;
