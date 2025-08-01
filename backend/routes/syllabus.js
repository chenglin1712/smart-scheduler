// backend/routes/syllabus.js (多檔案AI增強版)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const auth = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 初始化 Gemini AI (不變) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ★★★ 核心改造：修改 Multer 設定 ★★★
const storage = multer.memoryStorage();
// upload.array('syllabusFiles', 10) -> 'syllabusFiles' 是欄位名，10 是最多允許上傳的檔案數量
const upload = multer({ storage: storage }).array("syllabusFiles", 10);

// ★★★ 核心改造：更新 Prompt 指令 ★★★
const PROMPT = `
    你是一位專業的大學生課程助理。你的任務是從接下來提供的課程大綱(Syllabus)與數份課堂講義(Lecture Notes)的純文字中，找出所有需要被排入行程的任務。
    請綜合所有文件的內容，找出作業、報告、小考、期中考、期末考等事件。
    請根據講義內容補充任務細節。

    請將你找到的結果，格式化成一個 JSON 陣列。陣列中每個物件應包含以下三個 key：
    1. "title": (字串) 任務的標題，請盡可能詳細。
    2. "deadline": (字串) 任務的截止日期，格式必須是 "YYYY-MM-DD"。如果只提到月份和日期，請假設是今年(2025年)。
    3. "estimatedTime": (數字) 根據任務類型，預估一個合理的準備時間（以分鐘為單位）。例如：作業=180, 報告=300, 小考=120, 期中/期末考=600。

    如果文字中沒有任何可排程的任務，請回傳一個空的陣列 []。
    你的回應必須是純粹的、可直接被 JSON.parse 解析的 JSON 格式，不要包含任何 markdown 符號或額外說明。

    這是所有文件的純文字內容，以分隔線區隔：
`;

// --- POST /api/syllabus/upload/:courseId ---
router.post("/upload/:courseId", auth, upload, async (req, res) => {
  // ★★★ 核心改造：接收 req.files (複數) 而不是 req.file ★★★
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "沒有上傳任何檔案。" });
  }

  const { courseId } = req.params;
  const db = req.db;

  try {
    let combinedText = "";

    // 1. ★ 核心改造：遍歷所有上傳的檔案，解析並合併文字 ★
    for (const file of req.files) {
      combinedText += `\n\n--- 文件: ${file.originalname} ---\n\n`;
      const data = await pdfParse(file.buffer);
      combinedText += data.text;
    }

    // 2. 呼叫 Gemini API 進行綜合分析
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(PROMPT + combinedText);
    const response = await result.response;
    const aiResponseText = response.text();

    // 3. 解析 AI 回傳的 JSON (不變)
    const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
    const cleanedJson = jsonMatch ? jsonMatch[1] : aiResponseText;
    const tasksFromAI = JSON.parse(cleanedJson);

    if (!Array.isArray(tasksFromAI)) {
      throw new Error("AI 回應的格式不是一個陣列。");
    }

    // 4. 將 AI 解析出的任務存入資料庫 (不變)
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
      message: `✅ AI 綜合分析完成！成功為你新增了 ${count} 個任務。`,
    });
  } catch (error) {
    console.error("❌ Syllabus 處理過程中發生錯誤:", error);
    res.status(500).json({ message: "Syllabus 處理失敗，請稍後再試。" });
  }
});

module.exports = router;
