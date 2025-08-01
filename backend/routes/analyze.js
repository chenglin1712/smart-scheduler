// backend/routes/analyze.js (AI 考卷功能最終版)
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 初始化 Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- AI 指令 (Prompts) ---

// Prompt #1：用於解析任務
const TASK_PROMPT = `你是一位專業的大學生課程助理。你的任務是從接下來提供的課程大綱(Syllabus)純文字中，找出所有需要被排入行程的任務。請找出所有作業、報告、小考、期中考、期末考等事件。請忽略課程介紹、評分標準、老師資訊等非任務相關內容。請將你找到的結果，格式化成一個 JSON 陣列。陣列中每個物件應包含以下三個 key：1. "title": (字串) 任務的標題。2. "deadline": (字串) 任務的截止日期，格式必須是 "YYYY-MM-DD"。如果只提到月份和日期，請假設是今年(2025年)。3. "estimatedTime": (數字) 根據任務類型，預估一個合理的準備時間（以分鐘為單位）。例如：作業=180, 報告=300, 小考=120, 期中/期末考=600。如果文字中沒有任何可排程的任務，請回傳一個空的陣列 []。你的回應必須是純粹的、可直接被 JSON.parse 解析的 JSON 格式，不要包含任何 markdown 符號或額外說明。這是課程大綱的純文字內容：`;

// Prompt #2：專門用於產生摘要
const SUMMARY_PROMPT = `你是一位專業的學術助理，擅長快速閱讀並整理重點。你的任務是將接下來提供的、由多份文件（可能包含課程大綱和課堂講義）組合而成的純文字內容，整理成一份條理分明、易於考前複習的重點摘要。請遵循以下規則：1. 使用繁體中文。2. 使用 Markdown 的條列式語法 (例如使用 '*' 或 '-') 來呈現重點。3. 摘要內容需精簡、準確，並涵蓋所有核心概念與關鍵字。4. 你的回應必須是純粹的 Markdown 格式，不要包含任何額外說明或 JSON 符號。這是所有文件的純文字內容，以 "--- 文件分隔線 ---" 隔開：`;

// Prompt #3：專門用於產出考卷
const QUIZ_PROMPT = `你是一位專業的學科教授，擅長根據教材內容出題，以檢測學生的學習成效。你的任務是從接下來提供的、由多份文件組合而成的純文字內容中，設計一份包含10題選擇題的隨堂測驗。請嚴格遵循以下規則：1.  根據文件內容，產生10題單選選擇題，涵蓋核心概念與關鍵知識點。2.  每題都必須提供4個選項 (A, B, C, D)。3.  在4個選項中，必須有且僅有一個是正確答案。4.  為每一個選項（無論對錯）都提供一句簡短的、約15-30字的解釋 (rationale)，說明該選項為何正確或錯誤。5.  提供一個簡短的提示 (hint)，引導學生思考方向，但不能直接透露答案。6.  你的最終回應必須是一個可直接被 JSON.parse 解析的 JSON 物件，格式如下：{ "title": "課程隨堂測驗", "questions": [ { "question": "問題的完整敘述？", "hint": "一個簡短的提示。", "answerOptions": [ { "text": "選項A的內容", "isCorrect": false, "rationale": "選項A的解釋。" }, { "text": "選項B的內容", "isCorrect": true, "rationale": "選項B的解釋。" }, { "text": "選項C的內容", "isCorrect": false, "rationale": "選項C的解釋。" }, { "text": "選項D的內容", "isCorrect": false, "rationale": "選項D的解釋。" } ] } ] } 7.  不要包含任何 markdown 符號或額外說明，直接輸出純粹的 JSON 物件。這是所有文件的純文字內容：`;

// --- API 端點 ---

// POST /api/analyze/course/:courseId (解析任務)
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
    const result = await model.generateContent(TASK_PROMPT + combinedText);
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

// POST /api/analyze/course/:courseId/summarize (產生摘要)
router.post("/course/:courseId/summarize", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;
  try {
    const documents = await db.all(
      "SELECT textContent FROM Documents WHERE courseId = ?",
      [courseId]
    );
    if (documents.length === 0) {
      return res
        .status(404)
        .json({ message: "此課程尚未上傳任何文件可供摘要。" });
    }
    const combinedText = documents
      .map((doc) => doc.textContent)
      .join("\n\n--- 文件分隔線 ---\n\n");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(SUMMARY_PROMPT + combinedText);
    const response = await result.response;
    const summaryText = response.text();
    res.json({
      message: "AI 摘要產生成功！",
      summary: summaryText,
    });
  } catch (error) {
    console.error("❌ AI 摘要過程中發生錯誤:", error);
    res.status(500).json({ message: "AI 摘要失敗，請稍後再試。" });
  }
});

// ★★★ 新增：AI 產出考卷的 API ★★★
// POST /api/analyze/course/:courseId/quiz
router.post("/course/:courseId/quiz", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;
  try {
    const documents = await db.all(
      "SELECT textContent FROM Documents WHERE courseId = ?",
      [courseId]
    );
    if (documents.length === 0) {
      return res
        .status(404)
        .json({ message: "此課程尚未上傳任何文件可供出題。" });
    }
    const combinedText = documents
      .map((doc) => doc.textContent)
      .join("\n\n---\n\n");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(QUIZ_PROMPT + combinedText);
    const response = await result.response;
    const aiResponseText = response.text();

    const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
    const cleanedJson = jsonMatch ? jsonMatch[1] : aiResponseText;
    const quizData = JSON.parse(cleanedJson);

    res.json({
      message: "AI 考卷產生成功！",
      quiz: quizData,
    });
  } catch (error) {
    console.error("❌ AI 產出考卷過程中發生錯誤:", error);
    res.status(500).json({ message: "AI 產出考卷失敗，請稍後再試。" });
  }
});

module.exports = router;
