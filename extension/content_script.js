document.addEventListener("mousedown", function(event) {
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

  chrome.runtime.sendMessage({ element: attributes }, function (response) {
    console.log(response.farewell.element);
  });
});

//var button = document.getElementById("bt_login");
//console.log(button);
//console.log('here');
//button.addEventListener("click", function(event) {
//  alert(event);
//  alert("hello.");
//});
