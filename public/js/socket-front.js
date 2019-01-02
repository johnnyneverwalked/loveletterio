$(function () {

    var socket = io.connect('http://localhost:1234');
    var players = 0;
    var username = null;

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
        });

        $('#new-message').on('keydown', function (e) { //don't allow new lines
            if(e.keyCode === 13){
                return false;
            }
        });
        
        $('#new-message').on('keyup', function (e) { //send message with enter
            let val = $.trim($('#new-message').val());
            if(e.keyCode === 13 && val){
                socket.emit('message', {msg: val});
                $('#new-message').val('');
            }
        });

        $('#send-message').on('click', function () { //send message
            let val = $.trim($('#new-message').val());

            if(val){
                socket.emit('message', {msg: val});
                $('#new-message').val('');
            }
        });
    };

    var getGame = function(container_id){
        $.ajax({
            type: 'GET',
            async: false,
            url: "partials/_game.html",
            success: function (html) {
                $(container_id).append(html);
            },
            error: function (err) {
                console.warn(err);
                location.reload();
            }
        });

        $('#startbtn').on('click', function () {//start game
            $(this).hide();
            socket.emit('startGame');
        })
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
        $('#error-container').append('<p class="error-msg">'+data.reason+'</p>');
    });

    socket.on('error', function (data) {
        console.log(data);
    });

    socket.on('logMessage', function (data) {
        $('#messages').append('<p name="message">'+data.msg+'</p>');
        if(data.hasOwnProperty('color')){
            $('#messages p:last-child').css('color', data.color);
        }
    });

    socket.on('message', function (data) {
        $('#messages').append('<p name="message">'+data.username+': '+data.msg+'</p>');
        $('#messages p:last-child').css({color: data.color, fontWeight: 'bold'});
    });

    socket.on('joinedRoom', function (data) {
        $('#opponents .player-container').each(function () {
            if(!$(this).attr('id')){
                $(this).attr('id', data.username);
                $(this).find('.player-card').css('background', data.isDead ? 'gray' : 'mediumpurple').html('')
                    .append('<h4>player: '+data.username+'</h4>')
                    .append('<h4 name="points">points: 0</h4>');

                return false;
            }
        });

        players = data.player_num;
    });

    socket.on('joined', function (data) {
        $('#homemenu').remove();
        getChat('#container');
        getGame('#container');
        $('#you .player-card').css('background', data.isDead ? 'gray' : 'mediumpurple')
            .append('<h4>player: ' + data.username + '</h4>')
            .append('<h4 name="points">points: 0</h4>');

        data.players.forEach(function (player) {
            $('#opponents .player-container').each(function () {
                if (!$(this).attr('id')) {
                    $(this).attr('id', player.username);
                    $(this).find('.player-card').css('background', player.isDead ? 'gray' : 'mediumpurple').html('')
                        .append('<h4>player: ' + player.username + '</h4>')
                        .append('<h4 name="points">points: ' + player.points + '</h4>');

                    return false;
                }
            });

            players = data.player_num;

        });
    });

    socket.on('yourTurn', function (data) {

    });

    socket.on('nextTurn', function (data) {
    });

    socket.on('updateDeck', function (data) {
        $('#deck').html('<h1>'+data.cards_remaining+'</h1>');
        if(data.cards_remaining === 0){
            $('#deck').removeClass('card-back').addClass('empty-deck');
        }
    });

    socket.on('userLeft', function (data) {
        players = data.player_num;
    });

});