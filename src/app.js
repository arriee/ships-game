const path = require('path');

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const publicDirPath = path.join(__dirname, '../public');

app.use(express.static(publicDirPath));

io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('target', (coords) => {
        socket.broadcast.emit('target', coords);
    });

    socket.on('msg', (msg) => {
        socket.broadcast.emit('msg', msg);
    })
});

app.get('', ((req, res) => {
    res.render('index');
}))

server.listen(3000);