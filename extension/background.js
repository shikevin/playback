var recording = false;
//  chrome.runtime.onMessage.addListener(
//    function(request, sender, sendResponse) {
//      alert('message received');
//    }
//    sendResponse( {here: request.attributes });
//  );
var pageReceiver =  function(message, sender, sendResponse) {
  $.post("http://54.175.195.224:3000/chrome", { 
        'page' : message.page,
        'event' : "mousedown", 
        'element' : JSON.stringify(message.element) 
      }, function (data) {
    console.log(data);
    sendResponse(data);
  }).bind;
};

chrome.browserAction.onClicked.addListener(function(tab) {
  if (recording) {
    alert('stoped recording');
    recording = false;
    chrome.runtime.onMessage.removeListener(pageReceiver); 
  } else {
    alert('recording...');
    chrome.runtime.onMessage.addListener(pageReceiver);
    chrome.tabs.executeScript(null, {file: "jquery.js"}, function() {
       chrome.tabs.executeScript(null, {file: "content_script.js" })
    });
    recording = true;
  }
});

