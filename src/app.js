const path = require('path');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

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

        if (userInRoom < 2) {
            userInRoom++;
            socket.join(room, () => {
                roomName = room;
                socket.leave(socket.id, () => {
                    socket.emit('roomJoin', 'succeed');

                    if (userInRoom === 2) {
                        io.to(room).emit('roomCompleted');
                    }
                    // console.log(io.sockets.adapter.rooms);
                });
            });

        } else {
            socket.emit('roomJoin', 'full');
        }

    })




    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('target', (coords) => {
        socket.to(roomName).emit('target', coords);
    });

    socket.on('hitOrMiss', (msg) => {
        socket.to(roomName).emit('hitOrMiss', msg);
    })
});

app.get('', ((req, res) => {
    res.render('index');
}))

server.listen(3000);