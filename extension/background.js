var recording = false;
var hostName = "http://54.175.195.224:3000";
var current_session = "";
//  chrome.runtime.onMessage.addListener(
//    function(request, sender, sendResponse) {
//      alert('message received');
//    }
//    sendResponse( {here: request.attributes });
//  );
var pageReceiver =  function(message, sender, sendResponse) {
  $.post(hostName + "/chrome", { 
        'page' : message.page,
        'event' : "mousedown", 
        'element' : JSON.stringify(message.element), 
        'session' : current_session
      }, function (data) {
    console.log(data);
    sendResponse(data);
  }).bind;
};

chrome.browserAction.onClicked.addListener(function(tab) {
  if (recording) {
    alert('stoped recording.\nSee it here: ' +
      hostName + "/screenshots/" + current_session + "/0.html");
    recording = false;
    chrome.runtime.onMessage.removeListener(pageReceiver); 
  } else {
    alert('recording...');
    $.get(hostName + "/session", function(data) {
      current_session = data;
      console.log(current_session);
    });
    chrome.runtime.onMessage.addListener(pageReceiver);
    chrome.tabs.executeScript(null, {file: "jquery.js"}, function() {
       chrome.tabs.executeScript(null, {file: "content_script.js" })
    });
    recording = true;
  }
});

