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
