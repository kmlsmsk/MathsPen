chrome.action.onClicked.addListener((tab) => {
  // Chrome'un kendi ayar sayfaları (chrome://) hariç her yerde çalıştır
  if (!tab.url.startsWith("chrome://")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }).catch(err => console.log("Bu sayfada çalıştırılamaz:", err));
  }
});