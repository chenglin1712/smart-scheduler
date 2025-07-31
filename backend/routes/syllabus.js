// backend/routes/syllabus.js (AI 增強版)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const auth = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 初始化 Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Multer 設定 (不變) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ★★★ 這是我們給 AI 的指令 (Prompt) ★★★
const PROMPT = `
    你是一位專業的大學生課程助理。你的任務是從接下來提供的課程大綱(Syllabus)純文字中，找出所有需要被排入行程的任務。
    請找出所有作業、報告、小考、期中考、期末考等事件。
    請忽略課程介紹、評分標準、老師資訊等非任務相關內容。

    請將你找到的結果，格式化成一個 JSON 陣列。陣列中每個物件應包含以下三個 key：
    1. "title": (字串) 任務的標題。
    2. "deadline": (字串) 任務的截止日期，格式必須是 "YYYY-MM-DD"。如果只提到月份和日期，請假設是今年(2025年)。
    3. "estimatedTime": (數字) 根據任務類型，預估一個合理的準備時間（以分鐘為單位）。例如：作業=180, 報告=300, 小考=120, 期中/期末考=600。

    如果文字中沒有任何可排程的任務，請回傳一個空的陣列 []。

    你的回應必須是純粹的、可直接被 JSON.parse 解析的 JSON 格式，不要包含任何 markdown 符號或額外說明。

    這是課程大綱的純文字內容：
`;

// --- POST /api/syllabus/upload/:courseId ---
router.post(
  "/upload/:courseId",
  auth,
  upload.single("syllabusFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "沒有上傳任何檔案。" });
    }

    const { courseId } = req.params;
    const db = req.db;

    try {
      // 1. 解析 PDF 取得純文字
      const data = await pdfParse(req.file.buffer);
      const syllabusText = data.text;

      // 2. 呼叫 Gemini API 進行分析
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(PROMPT + syllabusText);
      const response = await result.response;
      const aiResponseText = response.text();

      // 3. 解析 AI 回傳的 JSON
      // AI 有時會回傳被 markdown 包住的 JSON，我們用正規表示式把它取出來
      const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      const cleanedJson = jsonMatch ? jsonMatch[1] : aiResponseText;
      const tasksFromAI = JSON.parse(cleanedJson);

      if (!Array.isArray(tasksFromAI)) {
        throw new Error("AI 回應的格式不是一個陣列。");
      }

      // 4. 將 AI 解析出的任務存入資料庫
      let count = 0;
      for (const task of tasksFromAI) {
        if (task.title && task.deadline) {
          await db.run(
            "INSERT INTO Tasks (title, deadline, estimatedTime, groupId, ownerId) VALUES (?, ?, ?, ?, ?)",
            [
              task.title,
              task.deadline,
              task.estimatedTime || null,
              courseId,
              req.user.id,
            ]
          );
          count++;
        }
      }

      res.json({
        message: `✅ AI 解析完成！成功為你新增了 ${count} 個任務。`,
      });
    } catch (error) {
      console.error("❌ Syllabus 處理過程中發生錯誤:", error);
      res.status(500).json({ message: "Syllabus 處理失敗，請稍後再試。" });
    }
  }
);

module.exports = router;
