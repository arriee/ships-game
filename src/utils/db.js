let db = {};

const addRoom = (room) => {
    const newRoom = {
        users: {}
    }
    db[room] = newRoom;
}

const removeRoom = (room) => {
    const newDb = {};
    const keys = Object.keys(db).reduce((acc, el) => {
        if (el !== room) {
            acc.push(el);
        }
        return acc;
    }, []);

    keys.forEach(el => newDb[el] = db[el]);

    db = newDb;
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

module.exports = {addRoom, removeRoom, addUser, getOpponent, setReady, isReady};