const db = {};

// Add cleaning after finish

const addRoom = (room) => {
    const newRoom = {
        users: {}
    }
    db[room] = newRoom;
}

const addUser = (room, userID) => {
    db[room].users[userID] = false;
}

const getOpponent = (room, userID) => {
    for (const el in db[room].users) {
        if (el !== userID) {
            return el;
        }
    }
}


const setReady = (room, userID) => {
    db[room].users[userID] = true;
}

const isReady = (room, userID) => {
    return db[room].users[userID];
}

module.exports = {addRoom, addUser, getOpponent, setReady, isReady};