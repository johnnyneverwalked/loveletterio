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
        isDead: false,
    }
}

io.on('connection', function (socket) {
    console.log('User connected');

    //create new game room
    socket.on('createRoom', function (data) {
        if(data.username.length === 0){
            data.username = 'anonymous';
        }

        if(data.room_name.length){
            let room = io.sockets.adapter.rooms[data.room_name];
            if(!room){
                socket.join(data.room_name);
                console.log('room:' +data.room_name+ 'created by ' + data.username);
                socket.emit('joinedRoom', {name: data.username});

                room = {
                    id: data.room_name,
                    players: [addPlayer(socket.id, data.username)]
                };
                rooms.push(room);
            }
            else{
                socket.emit('error', {reason: 'This room already exists'});
            }
        }
        else{
            socket.emit('error', {reason: 'Please enter a room name'});
        }
    });

    //join existing room
    socket.on('joinRoom', function (data) {
        if(data.username.length === 0){
            data.username = 'anonymous';
        }
        if(data.room_name.length){
            let room = io.sockets.adapter.rooms[data.room_name];
            if(room){
                if(room.length < 2) {
                    socket.join(data.room_name);
                    console.log('room:' + data.room_name + 'joined by ' + data.username);
                    socket.emit('joinedRoom', {name: data.username});
                    socket.broadcast.to(data.room_name).emit('joinedRoom', {name: data.username});

                    room = rooms.find(r => r.id === data.room_name);
                    room.players.push(addPlayer(socket.id, data.username));
                }
                else{
                    socket.emit('error', {reason: 'Room is full'});
                }
            }
            else{
                socket.emit('error', {reason: 'Room not found'});
            }
        }
        else{
            socket.emit('error', {reason: 'Please enter a room name'});
        }
    });

    //handle a user leaving
    socket.on('disconnecting',function () {
        socket.rooms.forEach(function (room) {
            let roomIndex = rooms.find(r => r.name === room);
            let playerIndex = rooms[roomIndex].players.findIndex(p => p.id === socket.id);

            if(playerIndex !== -1)
                socket.broadcast.to(room).emit('userLeft', {msg: rooms[roomIndex].players[playerIndex].username + 'left the room'});
                rooms[roomIndex].players.splice(playerIndex, 1);

            if(rooms[roomIndex].players.length === 0)
                rooms.splice(roomIndex, 1);
        });
    });

    //User disconnect
    socket.on('disconnect', function () {
        console.log('User Disconnected');
    })
});

server.listen(3000, function () {
    console.log('Listening on: 3000');
});
