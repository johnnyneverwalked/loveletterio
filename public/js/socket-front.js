$(function () {

    var socket = io.connect('http://localhost:1234');
    var players = 0;
    var username = 'anonymous';

    var getChat = function(container_id){
        $.ajax({
            type: 'GET',
            async: false,
            url: "partials/_chat.html",
            success: function (html) {
                $(container_id).append(html);
            },
            error: function (err) {
                console.warn(err);
                location.reload();
            }
        })

        $('#send-message').on('click', function () { //send message
            if($('#new-message').val()){
                socket.emit('message', {msg: $('#new-message').val()});
                $('#new-message').val('');
            }
        });
    };

    $('#newbtn').on('click', function () { //create new room

        $('#error-container').html('');
        if($('#username').val()){
            username = $('#username').val();
        }

       if($('#newRoom').val()){
           socket.emit('createRoom', {room_name: $('#newRoom').val(), username: username})
       }else{
           $('#error-container').append('<p class="error-msg">Please enter a room name</p>')
       }
    });

    $('#joinbtn').on('click', function () { // join room

        $('#error-container').html('');
        if($('#username').val()){
            username = $('#username').val();
        }

        if($('#joinRoom').val()){
            socket.emit('joinRoom', {room_name: $('#joinRoom').val(), username: username})
        }else{
            $('#error-container').append('<p class="error-msg">Please enter a room name</p>')
        }
    });


    //socket events

    socket.on('err', function (data) {
        $('#error-container').html('');
        $('#error-container').append('<p class="error-msg">'+data.reason+'</p>')
    });

    socket.on('joinedRoom', function (data) {
        players = data.player_num;
        $('#messages').append('<p name="message">'+data.name + ' joined the room'+'</p>')
    });

    socket.on('joined', function (data) {
        $('#menu').remove();
        getChat('#container');
        players = data.player_num;
        $('#messages').append('<p name="message">'+data.msg+'</p>')
    });

    socket.on('message', function (data) {
        $('#messages').append('<p name="message">'+data.username+': '+data.msg+'</p>')
        $('#messages p:last-child').css({color: data.color, fontWeight: 'bold'});
    });

    socket.on('userLeft', function (data) {
        players = data.player_num;
        $('#messages').append('<p name="message">'+data.msg+'</p>');
    });

});