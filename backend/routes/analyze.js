// backend/routes/analyze.js (摘要功能擴充版)
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 初始化 Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ★ Prompt #1：用於解析任務
const TASK_PROMPT = `你是一位專業的大學生課程助理... (此處省略你已有的任務 Prompt 內容)`;

// ★★★ 新增：Prompt #2，專門用於產生摘要 ★★★
const SUMMARY_PROMPT = `
    你是一位專業的學術助理，擅長快速閱讀並整理重點。
    你的任務是將接下來提供的、由多份文件（可能包含課程大綱和課堂講義）組合而成的純文字內容，整理成一份條理分明、易於考前複習的重點摘要。

    請遵循以下規則：
    1. 使用繁體中文。
    2. 使用 Markdown 的條列式語法 (例如使用 '*' 或 '-') 來呈現重點。
    3. 摘要內容需精簡、準確，並涵蓋所有核心概念與關鍵字。
    4. 你的回應必須是純粹的 Markdown 格式，不要包含任何額外說明或 JSON 符號。

    這是所有文件的純文字內容，以 "--- 文件分隔線 ---" 隔開：
`;

// --- POST /api/analyze/course/:courseId ---
// (解析任務的 API，保持不變)
router.post("/course/:courseId", auth, async (req, res) => {
  // ... 此路由的程式碼保持不變 ...
});

// ★★★ 新增：AI 產生重點摘要的 API ★★★
// --- POST /api/analyze/course/:courseId/summarize ---
router.post("/course/:courseId/summarize", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;

  try {
    // 1. 從資料庫撈取該課程的所有文件內容
    const documents = await db.all(
      "SELECT textContent FROM Documents WHERE courseId = ?",
      [courseId]
    );

    if (documents.length === 0) {
      return res
        .status(404)
        .json({ message: "此課程尚未上傳任何文件可供摘要。" });
    }

    // 2. 將所有文件的純文字內容串接起來
    const combinedText = documents
      .map((doc) => doc.textContent)
      .join("\n\n--- 文件分隔線 ---\n\n");

    // 3. 呼叫 Gemini API 進行分析 (使用新的 SUMMARY_PROMPT)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(SUMMARY_PROMPT + combinedText);
    const response = await result.response;
    const summaryText = response.text();

    res.json({
      message: "AI 摘要產生成功！",
      summary: summaryText, // 將 AI 產生的 Markdown 文字回傳給前端
    });
  } catch (error) {
    console.error("❌ AI 摘要過程中發生錯誤:", error);
    res.status(500).json({ message: "AI 摘要失敗，請稍後再試。" });
  }
});

// 為了方便你複製貼上，底下是解析任務的完整程式碼
const TASK_PROMPT_FULL = `你是一位專業的大學生課程助理。你的任務是從接下來提供的課程大綱(Syllabus)純文字中，找出所有需要被排入行程的任務。請找出所有作業、報告、小考、期中考、期末考等事件。請忽略課程介紹、評分標準、老師資訊等非任務相關內容。請將你找到的結果，格式化成一個 JSON 陣列。陣列中每個物件應包含以下三個 key：1. "title": (字串) 任務的標題。2. "deadline": (字串) 任務的截止日期，格式必須是 "YYYY-MM-DD"。如果只提到月份和日期，請假設是今年(2025年)。3. "estimatedTime": (數字) 根據任務類型，預估一個合理的準備時間（以分鐘為單位）。例如：作業=180, 報告=300, 小考=120, 期中/期末考=600。如果文字中沒有任何可排程的任務，請回傳一個空的陣列 []。你的回應必須是純粹的、可直接被 JSON.parse 解析的 JSON 格式，不要包含任何 markdown 符號或額外說明。這是課程大綱的純文字內容：`;
router.post("/course/:courseId", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;
  try {
    const documents = await db.all(
      "SELECT textContent FROM Documents WHERE courseId = ?",
      [courseId]
    );
    if (documents.length === 0) {
      return res.status(404).json({ message: "此課程尚未上傳任何文件。" });
    }
    const combinedText = documents
      .map((doc) => doc.textContent)
      .join("\n\n--- 文件分隔線 ---\n\n");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(TASK_PROMPT_FULL + combinedText);
    const response = await result.response;
    const aiResponseText = response.text();
    const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
    const cleanedJson = jsonMatch ? jsonMatch[1] : aiResponseText;
    const tasksFromAI = JSON.parse(cleanedJson);
    if (!Array.isArray(tasksFromAI)) {
      throw new Error("AI 回應的格式不是一個陣列。");
    }
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
    res.json({ message: `✅ AI 解析完成！成功為你新增了 ${count} 個任務。` });
  } catch (error) {
    console.error("❌ AI 分析過程中發生錯誤:", error);
    res.status(500).json({ message: "AI 分析失敗，請稍後再試。" });
  }
});

module.exports = router;
