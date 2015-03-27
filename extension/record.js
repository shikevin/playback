$(function() {
  var clicked = false;
  $('#start-stop').on('click', function(e) {
    e.preventDefault();
    if (clicked) {
      clicked = false;
      $('#start-stop').html('Start Recording');
    } else {
      clicked = true;
      $('#start-stop').html('Stop Recording');
    }
  });
});
  
