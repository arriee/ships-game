const {addRoom, removeRoom, addUser, getOpponent, setReady, isReady} = require('./utils/db');
const path = require('path');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

const publicDirPath = path.join(__dirname, '../public');

app.use(express.static(publicDirPath));

io.on('connection', (socket) => {
    console.log('user connected');
    let roomName;

    socket.on('join', ({ room }) => {

        let userInRoom = 0;

        if (io.sockets.adapter.rooms[room]) {
            userInRoom = io.sockets.adapter.rooms[room].length;
        }

        if (userInRoom === 0) {
            addRoom(room);
        }

        if (userInRoom < 2) {
            userInRoom++;
            socket.join(room, () => {
                roomName = room;
                addUser(room, socket.id);
                socket.leave(socket.id, () => {
                    socket.emit('roomJoin', 'succeed');

                    if (userInRoom === 2) {
                        io.to(room).emit('roomCompleted');
                    }
                });
            });

        } else {
            socket.emit('roomJoin', 'full');
        }
    });

    socket.on('disconnect', () => {
        removeRoom(roomName);
        console.log('user disconnected');
    });

    socket.on('ready', () => {
        setReady(roomName, socket.id);
        const isOpponentReady = isReady(roomName, getOpponent(roomName, socket.id));
        if (isOpponentReady) {
            socket.emit('ready');
            socket.to(roomName).emit('ready');
        }
    });

    socket.on('whoStarts', () => {
        const who = Object.keys(io.sockets.adapter.rooms[roomName].sockets).indexOf(socket.id);
        socket.emit('whoStarts', who);
    });

    socket.on('target', (coords) => {
        socket.to(roomName).emit('target', coords);
    });

    socket.on('hitOrMiss', (msg, coords) => {
        socket.to(roomName).emit('hitOrMiss', msg, coords);
    });

    socket.on('theEnd', () => {
        socket.to(roomName).emit('youWon');
    })
});

app.get('', ((req, res) => {
    res.render('index');
}))

server.listen(port);