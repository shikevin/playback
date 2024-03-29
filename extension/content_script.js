var bodyText = $("html").clone().find("script,noscript,style").remove().end().html();
var htmlText = "<html>" + bodyText + "</html>";

var sendPage = function(event) {
  var currentElement = event.target;
  var attributes = {};
  if (currentElement == null) {
    return;
  }
  do {
    for (var i = 0, atts = currentElement.attributes, n = atts.length; i < n; i++) {
      attribute = atts[i];
      if (attribute.nodeName == "class") {
        attributes['class'] = currentElement.classList;
      } else if (attribute.nodeName == "style") {
        //skip
      } else {
        attributes[attribute.nodeName] = attribute.nodeValue;
      }
    }
    currentElement = currentElement.parentElement;
  } while($.isEmptyObject(attributes));


  //mixed content (http server and https tophat problem)
  chrome.runtime.sendMessage({ page: htmlText,
    event: "mousedown",
    element: attributes 
  }, function (response) {
    console.log(response);
  });
  setTimeout(function() {
    bodyText = $("html").clone().find("script,noscript,style").remove().end().html();
    htmlText = "<html>" + bodyText + "</html>";
  }, 1500);
}

document.removeEventListener("mousedown", sendPage);
document.addEventListener("mousedown", sendPage);

chrome.runtime.onMessage.addListener(function(message) {
  if (message.text == "close") {
    document.removeEventListener("mousedown", sendPage);
  }
});
//var button = document.getElementById("bt_login");
//console.log(button);
//console.log('here');
//button.addEventListener("click", function(event) {
//  alert(event);
//  alert("hello.");
//});
