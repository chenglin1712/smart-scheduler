// backend/routes/analyze.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 初始化 Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ★★★ 這是我們給 AI 的「綜合分析」指令 (Prompt) ★★★
const PROMPT = `
    你是一位頂尖的大學生課程助理。你的任務是從接下來提供的多份文件中（可能包含一份課程大綱和數份課堂講義），綜合分析出所有需要被排入行程的任務。

    請找出所有作業、報告、小考、期中考、期末考等事件。如果不同文件中提到同一個任務，請以最晚的截止日期為準，不要重複建立。

    請將你找到的結果，格式化成一個 JSON 陣列。陣列中每個物件應包含以下三個 key：
    1. "title": (字串) 任務的標題。
    2. "deadline": (字串) 任務的截止日期，格式必須是 "YYYY-MM-DD"。如果只提到月份和日期，請假設是今年(2025年)。
    3. "estimatedTime": (數字) 根據任務類型，預估一個合理的準備時間（以分鐘為單位）。例如：作業=180, 報告=300, 小考=120, 期中/期末考=600。

    如果文件中沒有任何可排程的任務，請回傳一個空的陣列 []。

    你的回應必須是純粹的、可直接被 JSON.parse 解析的 JSON 格式，不要包含任何 markdown 符號或額外說明。

    這是所有文件的純文字內容，以 "--- 文件分隔線 ---" 隔開：
`;

// --- POST /api/analyze/course/:courseId ---
// 讀取某課程所有文件，送交 AI 分析，並將結果存入 Tasks 資料表
router.post("/course/:courseId", auth, async (req, res) => {
  const { courseId } = req.params;
  const db = req.db;

  try {
    // 1. 從資料庫撈取該課程的所有文件內容
    const documents = await db.all(
      "SELECT textContent FROM Documents WHERE courseId = ?",
      [courseId]
    );

    if (documents.length === 0) {
      return res.status(404).json({ message: "此課程尚未上傳任何文件。" });
    }

    // 2. 將所有文件的純文字內容串接起來
    const combinedText = documents
      .map((doc) => doc.textContent)
      .join("\n\n--- 文件分隔線 ---\n\n");

    // 3. 呼叫 Gemini API 進行分析
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(PROMPT + combinedText);
    const response = await result.response;
    const aiResponseText = response.text();

    // 4. 解析 AI 回傳的 JSON
    const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
    const cleanedJson = jsonMatch ? jsonMatch[1] : aiResponseText;
    const tasksFromAI = JSON.parse(cleanedJson);

    if (!Array.isArray(tasksFromAI)) {
      throw new Error("AI 回應的格式不是一個陣列。");
    }

    // 5. 將 AI 解析出的任務存入資料庫
    let count = 0;
    for (const task of tasksFromAI) {
      if (task.title && task.deadline) {
        // 這裡可以加入邏輯，檢查任務是否已存在，避免重複新增
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
    console.error("❌ AI 分析過程中發生錯誤:", error);
    res.status(500).json({ message: "AI 分析失敗，請稍後再試。" });
  }
});

module.exports = router;
