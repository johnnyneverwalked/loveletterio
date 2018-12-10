$(function () {

    $('#newbtn').on('click', function () {
       let roomName = $('#newRoom').val();

        $('#error-container').html('');
       if(roomName){
            $('#error-container').append('<p class="error-msg">OK you are off for now</p>')
       }else{
           $('#error-container').append('<p class="error-msg">Enter a room name fam</p>')
       }
    })

});