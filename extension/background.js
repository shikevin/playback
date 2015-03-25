chrome.browserAction.onClicked.addListener(function(tab) {
  alert('injected');
  chrome.tabs.executeScript(null, {file: "content_script.js"});
});
