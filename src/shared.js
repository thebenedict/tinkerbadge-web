export function pageConfig() {
  return JSON.parse(document.querySelector('#page-config').textContent);
}
export function text(node, value) { node.textContent = value; }
export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function formatBytes(n) { return n < 1e6 ? `${Math.round(n / 1000)} KB` : `${(n / 1e6).toFixed(1)} MB`; }
