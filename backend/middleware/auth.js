// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // 1. 從請求的 header 取得 token
  const authHeader = req.header("Authorization");

  // 2. 檢查 header 或 token 是否存在
  if (!authHeader) {
    return res.status(401).json({ message: "沒有提供 token，授權被拒絕。" });
  }

  // Header 格式為 "Bearer <token>"，我們需要取出 token 的部分
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token 格式錯誤，授權被拒絕。" });
  }

  try {
    // 3. 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. 將 token 解碼後的 payload (我們存的使用者資訊) 附加到 req 物件上
    req.user = decoded.user;

    // 5. 呼叫 next()，讓請求繼續往下傳遞給真正的路由處理函式
    next();
  } catch (error) {
    res.status(401).json({ message: "無效的 token。" });
  }
};
