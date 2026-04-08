const statusNode = document.getElementById("status");
const resultsNode = document.getElementById("results");
const fillButton = document.getElementById("fill-button");
const scanButton = document.getElementById("scan-button");

function setStatus(message) {
  statusNode.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderResults(items, emptyMessage) {
  if (!items.length) {
    resultsNode.innerHTML = `<div class="result-card"><p>${escapeHtml(emptyMessage)}</p></div>`;
    return;
  }

  resultsNode.innerHTML = items.map((item) => `
    <section class="result-card">
      <h2>${escapeHtml(item.fieldKey.replaceAll("_", " "))}</h2>
      <p>${escapeHtml(item.label || item.placeholder || item.name || item.id || "Unlabeled field")}</p>
      <p>${escapeHtml(item.path)}</p>
      <span class="pill">${escapeHtml(item.resultLabel || item.action || "matched")}</span>
    </section>
  `).join("");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendMessageToPage(type) {
  const tab = await getActiveTab();

  if (!tab?.id) {
    setStatus("Could not find the active tab.");
    return null;
  }

  return chrome.tabs.sendMessage(tab.id, { type }).catch(() => null);
}

async function scanCurrentPage() {
  setStatus("Scanning visible fields...");
  resultsNode.innerHTML = "";

  const response = await sendMessageToPage("ANISHKA_AUTOFILL_SCAN");

  if (!response) {
    setStatus("This page did not respond. Refresh it, then try again.");
    return;
  }

  setStatus(`Found ${response.fields.length} field${response.fields.length === 1 ? "" : "s"} that look fillable.`);
  renderResults(response.fields, "No matching fields were found on this page.");
}

async function fillCurrentPage() {
  setStatus("Autofilling the current page...");
  resultsNode.innerHTML = "";

  const response = await sendMessageToPage("ANISHKA_AUTOFILL_FILL");

  if (!response) {
    setStatus("This page did not respond. Refresh it, then try again.");
    return;
  }

  setStatus(`Filled ${response.filled.length} field${response.filled.length === 1 ? "" : "s"} and skipped ${response.skipped.length}.`);
  renderResults(response.filled, "No empty matching fields were filled on this page.");
}

fillButton.addEventListener("click", () => {
  fillCurrentPage().catch((error) => {
    console.error(error);
    setStatus("Autofill failed. Check the extension console for details.");
  });
});

scanButton.addEventListener("click", () => {
  scanCurrentPage().catch((error) => {
    console.error(error);
    setStatus("Scan failed. Check the extension console for details.");
  });
});
