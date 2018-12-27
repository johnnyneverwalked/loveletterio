const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);


app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

let rooms = [];

function addPlayer(id, username) {
    return {
        id: id,
        username: username,
        hand: [],
        points: 0,
        isDead: false,
    }
}

var stringToColor = function(str) {
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

function findRoomPlayer(socket){
    let data = null;
    Object.keys(socket.rooms).forEach(function (room) {
        let roomIndex = rooms.findIndex(r => r.id === room);
        if (roomIndex !== -1) {
            let player = rooms[roomIndex].players.find(p => p.id === socket.id);

            if (player){
                data = {room: room, username: player.username};
            }
        }
    });
    return data;
}

io.on('connection', function (socket) {
    console.log('User connected');

    //create new game room
    socket.on('createRoom', function (data) {

        if(data.room_name.length){
            let room = io.sockets.adapter.rooms[data.room_name];
            if(!room){
                socket.join(data.room_name);
                console.log('room: ' +data.room_name+ ', created by ' + data.username);
                socket.emit('joined', {msg: 'you have joined successfully', player_num: 1});

                room = {
                    id: data.room_name,
                    players: [addPlayer(socket.id, data.username)]
                };
                rooms.push(room);
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
        if(data.username.length === 0){
            data.username = 'anonymous';
        }
        if(data.room_name.length){
            let room = io.sockets.adapter.rooms[data.room_name];
            if(room) {
                room = rooms.find(r => r.id === data.room_name);
            }
            if(room){

                if(room.players.length < 2) { //Should be changed to four once it is working with two
                    socket.join(data.room_name);
                    console.log('room: ' + data.room_name + ', joined by ' + data.username);
                    socket.emit('joined', {msg: 'you have joined successfully', player_num: room.players.length+1});
                    socket.to(data.room_name).emit('joinedRoom', {name: data.username, player_num: room.players.length+1});

                    room = rooms.find(r => r.id === data.room_name);
                    room.players.push(addPlayer(socket.id, data.username));
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

    //send a chat message
    socket.on('message', function (data) {
        let r = findRoomPlayer(socket);
        if(r) {
            socket.to(r.room).emit('message', {
                username: r.username,
                msg: data.msg,
                color: stringToColor(socket.id)
            });
            socket.emit('message', {
                username: 'you',
                msg: data.msg,
                color: stringToColor(socket.id)
            });
        }
    });

    //handle a user leaving
    socket.on('disconnecting',function () {
        Object.keys(socket.rooms).forEach(function (room) {
            let roomIndex = rooms.findIndex(r => r.id === room);
            if(roomIndex !== -1) {
                let playerIndex = rooms[roomIndex].players.findIndex(p => p.id === socket.id);

                if (playerIndex !== -1) {
                    socket.to(room).emit('userLeft', {msg: rooms[roomIndex].players[playerIndex].username + ' left the room', player_num: rooms[roomIndex].players.length-1});
                    rooms[roomIndex].players.splice(playerIndex, 1);
                }

                if (rooms[roomIndex].players.length === 0)
                    rooms.splice(roomIndex, 1);
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
