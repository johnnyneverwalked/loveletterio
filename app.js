const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const escape = require('escape-html');


app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

let rooms = {};
let imgdest = '../images/copyright/';

let suits = {
    1: {
        id: 1,
        name: 'guard',
        image: imgdest + '1.jpg'
    },
    2: {
        id: 2,
        name: 'priest',
        image: imgdest + '2.jpg'
    },
    3: {
        id: 3,
        name: 'baron',
        image: imgdest + '3.jpg'
    },
    4: {
        id: 4,
        name: 'handmaid',
        image: imgdest + '4.jpg'
    },
    5: {
        id: 5,
        name: 'prince',
        image: imgdest + '5.jpg'
    },
    6: {
        id: 6,
        name: 'king',
        image: imgdest + '6.jpg'
    },
    7: {
        id: 7,
        name: 'countess',
        image: imgdest + '7.jpg'
    },
    8: {
        id: 8,
        name: 'princess',
        image: imgdest + '8.jpg'
    }
};

let cardEffects = function (room, data) {

    switch (data.cardPlayed.id) {
        case 1://guard
            if(data.currentPlayer !== data.targetPlayer && data.cardChosen.id === data.targetPlayer.hand[0].id){
                data.targetPlayer.isDead = true;
                data.targetPlayer.hand.forEach(function (card) {
                    io.in(room.id).emit('cardPlayed', {username: data.targetPlayer.username, card: card});
                });
                io.in(room.id).emit('logMessage', {msg: data.currentPlayer.username+" guessed: "+data.cardChosen.name, color: 'green'});
                io.in(room.id).emit('killed', {username: data.targetPlayer.username});
            }
            break;
        case 2://priest
            io.to(data.currentPlayer.id).emit('logMessage', {msg: "Card revealed: "+data.targetPlayer.hand[0].name, color: 'green'});
            break;
        case 3://baron
            if(data.currentPlayer !== data.targetPlayer) {
                if (data.currentPlayer.hand[0].id > data.targetPlayer.hand[0].id) {
                    data.targetPlayer.isDead = true;
                    data.targetPlayer.hand.forEach(function (card) {
                        io.in(room.id).emit('cardPlayed', {username: data.targetPlayer.username, card: card});
                    });
                    io.in(room.id).emit('killed', {username: data.targetPlayer.username});
                    io.to(data.currentPlayer.id).emit('logMessage', {msg: "Opponent had a: "+data.targetPlayer.hand[0].name, color: 'green'});
                    io.to(data.targetPlayer.id).emit('logMessage', {msg: "Opponent had a: "+data.currentPlayer.hand[0].name, color: 'green'});
                } else if (data.currentPlayer.hand[0].id < data.targetPlayer.hand[0].id) {
                    data.currentPlayer.isDead = true;
                    data.currentPlayer.hand.forEach(function (card) {
                        io.in(room.id).emit('cardPlayed', {username: data.currentPlayer.username, card: card});
                    });
                    io.in(room.id).emit('killed', {username: data.currentPlayer.username});
                    io.to(data.currentPlayer.id).emit('logMessage', {msg: "Opponent had a: "+data.targetPlayer.hand[0].name, color: 'green'});
                    io.to(data.targetPlayer.id).emit('logMessage', {msg: "Opponent had a: "+data.currentPlayer.hand[0].name, color: 'green'});
                } else {
                    io.to(data.currentPlayer.id).emit('logMessage', {msg: "You had the same card as your opponent", color: 'green'});
                    io.to(data.targetPlayer.id).emit('logMessage', {msg: "You had the same card as your opponent", color: 'green'});
                }
            }
            break;
        case 4://handmaid
            data.currentPlayer.isProtected = true;
            io.in(room.id).emit('protected', {username: data.currentPlayer.username});
            break;
        case 5://prince
            let discarded = data.targetPlayer.hand.shift();
            io.in(room.id).emit('cardPlayed', {username: data.targetPlayer.username, card: discarded});
            if(discarded.id === 8){
                data.targetPlayer.isDead = true;
                io.in(room.id).emit('killed', {username: data.targetPlayer.username});
            }else if(room.deck.length > 0) {
                data.targetPlayer.hand.push(room.deck.shift());
                io.in(room.id).emit('updateDeck', {cards_remaining: room.deck.length});
            }else{
                data.targetPlayer.hand.push(room.wildcard);
                io.in(room.id).emit('logMessage', {msg: 'No cards left, wildcard was drawn instead', color: 'green'});
            }
            io.to(data.targetPlayer.id).emit('updateHand', {hand: data.targetPlayer.hand});
            break;
        case 6://king
            if(data.currentPlayer !== data.targetPlayer) {
                let tmp = data.currentPlayer.hand.shift();
                data.currentPlayer.hand.push(data.targetPlayer.hand.shift());
                data.targetPlayer.hand.push(tmp);
                io.to(data.targetPlayer.id).emit('updateHand', {hand: data.targetPlayer.hand});
                io.to(data.currentPlayer.id).emit('updateHand', {hand: data.currentPlayer.hand});
            }
            break;
        case 8://princess
            data.currentPlayer.isDead = true;
            data.currentPlayer.hand.forEach(function (card) {
                io.in(room.id).emit('cardPlayed', {username: data.currentPlayer.username, card: card});
            });
            io.in(room.id).emit('killed', {username: data.currentPlayer.username});
            break;
    }
};


let buildDeck = function () {
    let deck = [];
    for(i=0; i<5; i++){
        deck.push(suits[1])
    }
    for(i=0; i<2; i++){
        deck.push(suits[2]);
        deck.push(suits[3]);
        deck.push(suits[4]);
        deck.push(suits[5]);
    }
    deck.push(suits[6]);
    deck.push(suits[7]);
    deck.push(suits[8]);


    return deck;
};

function addPlayer(id, username) {
    return {
        id: id,
        username: username,
        hand: [],
        discarded: [],
        points: 0,
        isProtected: false,
        isDead: false,
    }
}

let stringToColor = function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
};

let sum_array = function (array, prop) {
    var total = 0;
    for ( var i = 0, _len = array.length; i < _len; i++ ) {
        total += array[i][prop];
    }
    return total;
};

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

//returns an object with the room name roomIndex and the player username
function findRoomPlayer(socket){
    let data = null;
    Object.keys(socket.rooms).forEach(function (room) {
        // let roomIndex = rooms.findIndex(r => r.id === room);
        if (rooms[room]) {
            let player = rooms[room].players.find(p => p.id === socket.id);

            if (player){
                data = {room: room, username: player.username};
            }
        }
    });
    return data;
}

function getPlayers(room, id) {
    let players = [];
    room.players.forEach(function (player) {
        if(player.id !== id) {
            players.push({
                username: player.username,
                discarded: player.discarded,
                points: player.points,
                isDead: player.isDead,
            })
        }
    });
    return players;
}

function initGame(room){
    room.deck = shuffle(buildDeck());
    room.discarded = [];
    room.disconnected = [];
    if(room.players.length === 2){
        for(i=0; i<3; i++){
            room.discarded.push(room.deck.shift());
        }
    }
    room.wildcard = room.deck.shift();
    room.players.forEach(function (player) {
        player.hand = [room.deck.shift()];
        player.discarded = [];
        player.isDead = false;
        player.isProtected = false;

        io.to(player.id).emit('gameStarted', {hand: player.hand, discarded: room.discarded});
        io.to(player.id).emit('logMessage', {msg: "New Game Started!"});
    });
    room.turn = Math.floor(Math.random()*room.players.length);
    room.playing = true;
}

function checkDeaths(room) {//check if an end game condition is met
    let alive = [];
    room.players.forEach(function (player) {
        if(!player.isDead){
            alive.push(player);
        }
    });
    if(alive.length < 2){
        room.playing = false;
        if(alive.length === 1){
            alive[0].points++;
            io.in(room.id).emit('win', {winner:alive[0].username, points: alive[0].points});
            io.in(room.id).emit('logMessage', {msg: alive[0].username+' won the round!'});
        }

        io.in(room.id).emit('gameEnded', {wildcard: room.wildcard});
    }
}

function checkDeck(room) { //check winner if deck runs out
    if( room.deck.length !== 0)
        return;
    let max_card = 0;
    let max_discarded = 0;
    let winner = null;
    room.players.forEach(function (player) {
        if(!player.isDead && player.hand[0].id >= max_card){
            let sum_discarded = sum_array(player.discarded, 'id');
            if(player.hand[0].id === max_card && sum_discarded === max_discarded){
                winner = null;
            }else {
                max_card = player.hand[0].id;
                max_discarded = sum_discarded;
                winner = player;
            }
        }
    });
    if(winner){
        winner.points++;
        io.in(room.id).emit('win', {winner: winner.username, points: winner.points});
        io.in(room.id).emit('logMessage', {msg: winner.username+' won the round!'});
    }else {
        io.in(room.id).emit('logMessage', {msg: 'No winner for this round'});
    }
    room.playing = false;
    io.in(room.id).emit('gameEnded', {wildcard: room.wildcard});
}

function nextTurn(room){
    checkDeaths(room);
    checkDeck(room);
    if(room.playing) {
        do {
            room.turn++;
            if (room.players.length <= room.turn) {
                room.turn = 0;
            }
            if (!room.players[room.turn].isDead) {
                let active = room.players[room.turn];
                active.hand.push(room.deck.shift());
                active.isProtected = false;
                io.to(active.id).emit('updateHand', {hand: active.hand});
                io.to(active.id).emit('yourTurn', {
                    username: active.username
                });
                room.players.forEach(function (player) {
                    if (player.id !== active.id) {
                        io.to(player.id).emit('nextTurn', {
                            active_player: active.username
                        });
                    }
                });
                io.in(room.id).emit('updateDeck', {cards_remaining: room.deck.length});
            }
        } while (room.players[room.turn].isDead);
    }
}

io.on('connection', function (socket) {
    console.log('User connected');

    //create new game room
    socket.on('createRoom', function (data) {
        if(!data.username){
            socket.emit('err', {reason: 'Please enter a username'});
            return;
        }

        if(data.room_name.length){
            let room_name = escape(data.room_name);
            let username = escape(data.username);
            let room = io.sockets.adapter.rooms[room_name];
            if(!room){
                socket.join(room_name);
                console.log('room: ' +room_name+ ', created by ' + username);
                socket.emit('joined', {
                    username: username,
                    player_num: 1,
                    players: []
                });
                room = {
                    id: room_name,
                    players: [addPlayer(socket.id, username)],
                    disconnected: []
                };
                rooms[room_name] = room;
            }
            else{
                socket.emit('err', {reason: 'This room already exists'});
            }
        }
        else{
            socket.emit('err', {reason: 'Please enter a room name'});
        }
    });

    //join existing room
    socket.on('joinRoom', function (data) {
        if(!data.username){
            socket.emit('err', {reason: 'Please enter a username'});
            return;
        }

        if(data.room_name.length){
            let room_name = escape(data.room_name);
            let username = escape(data.username);

            let room = io.sockets.adapter.rooms[room_name];

            if(room && rooms[room_name]){
                room = rooms[room_name];
                if(room.players.length < 4) {
                    if(room.players.findIndex(p => p.username === username) === -1) {
                        socket.join(room_name);
                        room.players.push(addPlayer(socket.id, username));
                        if(room.playing){
                            room.players[room.players.length-1].isDead = true;
                        }
                        console.log('room: ' + room_name + ', joined by ' + username);
                        socket.emit('joined', {
                            player_num: room.players.length + 1,
                            username: username,
                            isDead: room.playing,
                            players: getPlayers(room, socket.id)
                        });

                        socket.to(room_name).emit('joinedRoom', {
                            player_num: room.players.length + 1,
                            username: username,
                            isDead: room.playing
                        });
                        socket.to(room_name).emit('logMessage', {msg: username+' joined the room',});
                    }
                    else{
                        socket.emit('err', {reason: 'Username already taken'});
                    }
                }
                else{
                    socket.emit('err', {reason: 'Room is full'});
                }
            }
            else{
                socket.emit('err', {reason: 'Room not found'});
            }
        }
        else{
            socket.emit('err', {reason: 'Please enter a room name'});
        }
    });

    //start game
    socket.on('startGame', function () {
        let r = findRoomPlayer(socket);
        let room = rooms[r.room];

        if(room.playing){
            socket.emit('gameStarted', {discarded: room.discarded});
            socket.emit('updateDeck', {cards_remaining: room.deck.length});
        }else {
            if (room && room.players.length > 1) {
                initGame(room);
                nextTurn(room);
            } else {
                socket.emit('logMessage', {msg: 'Not enough players', color: 'red'})
            }
        }
    });

    socket.on('playCard', function (data) {
        let cheat = false;
        let cardIndex;
        let r = findRoomPlayer(socket);
        let player = rooms[r.room].players.find(p => p.id === socket.id);
        let target = rooms[r.room].players.find(p => p.username === data.target);
        let cardChosen = suits[data.cardChosen];
        let card = suits[data.cardPlayed];

        if(player) {
            let countess = player.hand.findIndex(c => c.id === 7);
            let kingOrprince = player.hand.find(c => {
                return c.id === 5 || c.id === 6
            });
            if (kingOrprince && countess !== -1) {//check for countess condition
                io.in(r.room).emit('cardPlayed', {username: r.username, card: player.hand[countess]});
                player.hand.splice(countess, 1);
                socket.emit('updateHand', {hand: player.hand});
            } else {
                //check for potential cheating by manipulating the DOM
                if (card) {//check card validity
                    cardIndex = player.hand.findIndex(c => c.id === card.id);
                    if ((card.id === 1 && !cardChosen) //guard choice validity
                        || cardIndex === -1 //card is not in player's hand
                        || (!target && !rooms[r.room].disconnected.includes(data.target)) // target validity
                        || (target && target !== player && (target.isProtected || target.isDead))) {// target validity
                        cheat = true;
                    }
                } else {
                    cheat = true;
                }

                if (!cheat) {
                    if (!player.isDead) {//check if card exists in hand
                        if (cardIndex !== -1) {
                            player.discarded.push(player.hand.splice(cardIndex, 1)[0]);
                            cardEffects(rooms[r.room], {
                                currentPlayer: player,
                                targetPlayer: target,
                                cardChosen: cardChosen,
                                cardPlayed: card
                            });
                            io.in(r.room).emit('cardPlayed', {username: r.username, card: card});
                        }
                    }
                } else {
                    player.isDead = true;
                    player.hand.forEach(function (card) {
                        io.in(r.room).emit('cardPlayed', {username: player.username, card: card});
                    });
                    player.hand = [];
                    io.in(r.room).emit('killed', {username: player.username})
                }
            }
        }
        nextTurn(rooms[r.room])
    });

    //send a chat message
    socket.on('message', function (data) {
        let r = findRoomPlayer(socket);
        if(r) {
            socket.to(r.room).emit('message', {
                username: r.username,
                msg: escape(data.msg),
                color: stringToColor(socket.id)
            });
            socket.emit('message', {
                username: 'you',
                msg: escape(data.msg),
                color: stringToColor(socket.id)
            });
        }
    });

    //handle a user leaving
    socket.on('disconnecting',function () {
        Object.keys(socket.rooms).forEach(function (room) {
            if(rooms[room]) {
                let playerIndex = rooms[room].players.findIndex(p => p.id === socket.id);

                if (playerIndex !== -1) {
                    socket.to(room).emit('userLeft', {
                        username: rooms[room].players[playerIndex].username,
                        player_num: rooms[room].players.length-1
                    });
                    socket.to(room).emit('logMessage', {msg: rooms[room].players[playerIndex].username + ' left the room'});
                    let player = rooms[room].players.splice(playerIndex, 1)[0];
                    player.hand.forEach(function (card) {
                        socket.to(room).emit('cardPlayed', {username: player.username, card: card});
                    });
                    rooms[room].disconnected.push(player.username)
                }

                if (rooms[room].players.length === 0) {
                    delete rooms[room];
                    return;
                }
                if(rooms[room].playing){
                    if(rooms[room].players.length === 1) {
                        socket.to(room).emit('logMessage', {
                            msg: 'Game ended. Not enough players',
                            color: 'red'
                        });
                        rooms[room].playing = false;
                        socket.to(room).emit('gameEnded', {wildcard: rooms[room].wildcard});
                        return;
                    }
                    checkDeaths(rooms[room]);
                    if(playerIndex === room.turn && rooms[room].playing) {
                        nextTurn(rooms[room]);
                    }
                }
            }
        });
    });

    //User disconnect
    socket.on('disconnect', function () {
        console.log('User Disconnected');
    })
});

server.listen(1234, function () {
    console.log('Listening on: 1234');
});
