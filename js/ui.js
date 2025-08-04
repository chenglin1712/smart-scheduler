// js/ui.js
function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // 動畫結束後移除元素
  setTimeout(() => {
    toast.remove();
  }, duration + 500); // 停留時間 + 淡出動畫時間
}

function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.error('找不到 ID 為 "toast-container" 的元素！');
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // 動畫結束後從 DOM 中移除元素，保持頁面乾淨
  setTimeout(() => {
    toast.remove();
  }, duration + 500); // 停留時間 + 淡出動畫時間
}
