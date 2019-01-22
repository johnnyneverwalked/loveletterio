$(function () {

    var socket = io.connect('http://localhost:1234');
    var protection = [];
    var players = [];
    var lastPlayed = null;
    var username = null;

    var remove = function(array, element) {
        const index = array.indexOf(element);

        if (index !== -1) {
            array.splice(index, 1);
        }
    };

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
            socket.emit('startGame');
        });

        $('#rules').hover(function () {
            $('#card-prev').css('background-image', "url(../images/copyright/rules.jpg)").show()
        }, function () {
            $('#card-prev').hide();
        });
        
        $('#cards .card').each(function () { //modal cards events
            $(this).css('background-image', 'url("images/copyright/'+$(this).attr('face')+'.jpg")');
            $(this).on('click', function () {
                $('#cards .selected-card').removeClass('selected-card');
                $(this).addClass('selected-card');
                $('#cards').attr('face', $(this).attr('face'));
            });
        })


    };

    var playCard = function(cardPlayed, target, cardChosen){
        console.log(cardPlayed, target, cardChosen);
        socket.emit('playCard', {
            cardPlayed: cardPlayed,
            cardChosen: cardChosen,
            target: target
        });
    };

    var showSelect = function () {
        let cards = ['1','2','3','5','6'];

        if(cards.includes(lastPlayed)) {

            if (lastPlayed === '1') {
                $('#cards').show();
            } else {
                $('#cards').hide();
            }

            $('#playerSelect').html('');

            //check if player is allowed to choose themselves
            if(lastPlayed === '5'
                || protection.length === players.length
                || (protection.length === players.length - 1
                    && !protection.includes(username))){
                $('#playerSelect').append('<option>' + username + '</option>');
            }
            players.forEach(function (player) { //add selectable players
                if (protection.indexOf(player) === -1 && player !== username) {
                    $('#playerSelect').append('<option>' + player + '</option>');
                }
            });

            $('#selectbtn').on('click', function () {
                let face = $('#cards').attr('face');
                if(lastPlayed !== '1' || face){//check if there is a guard target, opponent is selected by default
                    $(this).off('click');
                    $('#selectModal').modal('hide');
                    $('#showSelectButton').hide();
                    playCard(lastPlayed, $('#playerSelect').find(':selected').text(), face);
                }
            });

            $('#showSelectButton').show();
            $('#selectModal').modal('show');
        }else{
            playCard(lastPlayed, username);
        }
    };

    var addCard = function(selector, card){
        $(selector).append('<div face="'+card.id+'" class="card card-mini"></div>');
        $(selector + ' div:last-child').hover(function () {
            $('#card-prev').css('background-image', "url("+card.image+")").show()
        }, function () {
            $('#card-prev').hide();
        }).css('background-image', "url("+card.image+")");

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

    socket.on('joinedRoom', function (data) {//someone else joined
        $('#opponents .player-container').each(function () {
            if(!$(this).attr('id')){
                $(this).attr('id', data.username);
                $(this).find('.player-card').css('background', data.isDead ? 'gray' : 'mediumpurple').html('')
                    .append('<h4>player: '+data.username+'</h4>')
                    .append('<h4 name="points">points: 0</h4>');

                return false;
            }
        });
        players.push(data.username);
        if(data.isDead){
            protection.push(data.username);
        }
    });

    socket.on('joined', function (data) {//this joined
        $('#homemenu').remove();
        getChat('#container');
        getGame('#container');
        $('#you .player-card').css('background', data.isDead ? 'gray' : 'mediumpurple')
            .append('<h4>player: ' + data.username + '</h4>')
            .append('<h4 name="points">points: 0</h4>');

        players.push(data.username);
        if(data.isDead){
            protection.push(data.username);
        }

        data.players.forEach(function (player) {
            $('#opponents .player-container').each(function () {
                players.push(player.username);
                if(player.isDead){
                    protection.push(player.username);
                }
                if (!$(this).attr('id')) {
                    $(this).attr('id', player.username);
                    $(this).find('.player-card').css('background', player.isDead ? 'gray' : 'mediumpurple').html('')
                        .append('<h4>player: ' + player.username + '</h4>')
                        .append('<h4 name="points">points: ' + player.points + '</h4>');

                    player.discarded.forEach(function (card) {// doesnt work yet
                        addCard('#'+player.username+'.discard-pile', card);
                    });
                    return false;
                }
            });
        });
        if(data.isDead){
            $('#deck-container').show();
            $('#startbtn').trigger('click');
        }
    });

    socket.on('updateHand', function (data) {
        $('#you .hand').empty();
        data.hand.forEach(function (card) {
            addCard('#you .hand', card);
        });
    });

    socket.on('yourTurn', function (data) {
        remove(protection, data.username);
        $('#you .player-card').append($('#coin'));

        $('#you .player-card .shield').remove();


        $('#you .hand .card').on('click', function () {// event for play card
            $('#you .hand .card').off('click');
            $(this).remove();

            lastPlayed = $(this).attr('face');
            showSelect();
        })

    });

    socket.on('nextTurn', function (data) {
        remove(protection, data.active_player);
        $('#'+data.active_player+' .player-card').append($('#coin'));
        $('#'+data.active_player+' .player-card .shield').remove();
        $('#you .hand .card').off('click');
    });

    socket.on('cardPlayed', function (data) {
        let selector, pos;

        if(data.username === username){
            selector = '#you .discard-pile';
            pos = 'bottom';
        }else {
            selector = '#' + data.username + ' .discard-pile';
            pos = 'top';
        }
        addCard(selector, data.card);

        let css_params = {
            position: 'absolute',
            left: ($(selector+' .card').length-1)*0.5*$(selector+' .card').width(),
        };
        css_params[pos] = 0;
        $(selector+' .card').last().css(css_params);
    });

    socket.on('gameStarted', function (data) {
        $('#deck-container').show();
        $('#startbtn').hide();
        $('.hand').empty();
        $('.discard-pile').empty();
        $('#deck-discards').empty();
        $('#wildcard').addClass('card-back')
            .unbind('mouseenter mouseleave')
            .html('<h1>?</h1>')
            .removeAttr('style');
        $('#deck').removeClass('empty-deck').addClass('card-back');

        if(data){
            if(data.hasOwnProperty('hand')) {
                addCard('#you .hand', data.hand[0]);
            }
            data.discarded.forEach(function (card) {
                addCard('#deck-discards', card);
            })
        }
        $('.player-container[id] .player-card').css('background', 'mediumpurple')
    });

    socket.on('gameEnded', function (data) {
        protection = [];
        $('#startbtn').show();
        $('#wildcard').hover(function () {
            $('#card-prev').css('background-image', "url("+data.wildcard.image+")").show()
        }, function () {
            $('#card-prev').hide();
        }).removeClass('card-back').empty()
            .css('background-image', "url("+data.wildcard.image+")");

    });

    socket.on('win', function (data) {
        if(username !== data.winner){
            $('#'+data.winner+' [name=points]').text('points: '+data.points);
        }else{
            $('#you [name=points]').text('points: '+data.points);
        }
    });


    socket.on('updateDeck', function (data) {
        let dimensions = 3 + data.cards_remaining;
        $('#deck').css({//give a deck thinning effect
            'border-top-left-radius': dimensions,
            'border-top-right-radius': 0,
            'border-bottom-right-radius': dimensions,
            'border-bottom-left-radius': 0,
            'border-top-width': 3,
            'border-left-width': dimensions,
            'border-bottom-width': dimensions,
            'border-right-width': 3,
            }).html('<h1>'+data.cards_remaining+'</h1>');


        if(data.cards_remaining === 0){
            $('#deck').removeClass('card-back').addClass('empty-deck');
        }
    });

    socket.on('killed', function (data) {
        protection.push(data.username);
        if(username !== data.username) {
            $('#' + data.username + ' .player-card').css('background', 'gray');
        }else{
            $('#you .player-card').css('background', 'gray');
            $('#you .hand').empty();

        }
    });

    socket.on('protected', function (data) { //handmaid protection event
        protection.push(data.username);
        if(username !== data.username) {
            $('#' + data.username + ' .player-card').append('<img class="coin shield" src="images/shield.png">');
        }else{
            $('#you .player-card').append('<img class="coin shield" src="images/shield.png">');
        }
    });

    socket.on('userLeft', function (data) {
        $('#'+data.username +' .player-card').css('background', 'rgba(255, 255, 255, 0.2)')
            .html('<h4>Empty Seat</h4>');
        $('#'+data.username).removeAttr('id');
        remove(players, data.username);
        remove(protection, data.username);
    });

});
