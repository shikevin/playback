var recording = false;
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  $.post("http://54.175.195.224:3000/chrome", { 
        'page' : message.page,
        'event' : "mousedown", 
        'element' : JSON.stringify(message.element) 
      }, function (data) {
    sendResponse(data);
  }).bind;
});

//  chrome.runtime.onMessage.addListener(
//    function(request, sender, sendResponse) {
//      alert('message received');
//    }
//    sendResponse( {here: request.attributes });
//  );
chrome.browserAction.onClicked.addListener(function(tab) {
  if (recording) {
    alert('stoped recording');
    recording = false;
  } else {
    alert('recording...');
    chrome.tabs.executeScript(null, {file: "jquery.js"}, function() {
       chrome.tabs.executeScript(null, {file: "content_script.js" })
    });
    recording = true;
  }
});

