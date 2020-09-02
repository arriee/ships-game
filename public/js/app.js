let socket = io();

const mainDOM = document.querySelector('main');
const containerDOM = document.querySelector('.container');
const infoContainerDOM = document.querySelector('.infoContainer');
const inputDOM = document.querySelector('input');
const formDOM = document.querySelector('form');

const opponentsMoveMsg = 'Opponent\'s move';
const yourMoveMsg = 'Your move';

const createField = (n) => {

    let field, subElements;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const el = document.createElement('table');
    el.className = 'field';

    for (let i = 0; i <= n; i++) {
        const row = document.createElement('tr');
        row.dataset.id = 'row' + i;
        row.className = 'row';

        for (let i = 0; i <= n; i++) {
            const col = document.createElement('td');
            col.dataset.id = 'col' + i;
            col.className = 'col';

            row.appendChild(col);
        }

        el.appendChild(row);
    }

    const div = document.createElement('div');
    div.className = 'tables'
    div.appendChild(el)
    field = div;

    const obj = {};
    const fieldElements = field.querySelectorAll('[data-id]');

    for (const element of fieldElements) {
        if (element.className === 'row') {
            obj[element.dataset.id] = element;
        }
    }

    subElements = obj;

    for (let i = 0; i <= n; i++) {
        const el = subElements[`row${i}`];

        // 1-n
        if (el.dataset.id === 'row0') {
            el.children[0].classList.add('coordinates');
            for (let t = 1; t <= n; t++) {
                el.children[t].innerText = t;
                el.children[t].classList.add('coordinates');
            }
            continue;
        }

        // A-Z
        el.children[0].innerText = alphabet[i - 1];
        el.children[0].classList.add('coordinates');
    }

    return {field, subElements};
}

const joinRoom = (room) => {
    socket.emit('join', { room });


    socket.on('roomJoin', (msg) => {
        if (msg === 'succeed') {
            mainDOM.innerHTML = ''
            containerDOM.innerHTML = ''
            mainDOM.innerHTML = '<h1>Waiting for opponent...</h1>'

        } else if (msg === 'full') {
            containerDOM.innerHTML = '<h2>Room is full</h2>'
        }
    })

    socket.on('roomCompleted', () => {
        mainDOM.innerHTML = ''
        containerDOM.innerHTML = ''
        const playerField = new DrawingLogic('normal');
        mainDOM.appendChild(playerField.field);
        containerDOM.appendChild(playerField.info)
    })

}

const prepareNewGame = () => {
    formDOM.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const room = inputDOM.value;

        if (room) {
            joinRoom(room);
        }
    })

}

const startGame = (playerField, database) => {

    socket.emit('ready');

    // add sub elements
    mainDOM.innerHTML = '';
    containerDOM.innerHTML = '';

    const opponentField = createField(10);

    mainDOM.appendChild(playerField.field);
    mainDOM.appendChild(opponentField.field);

    console.log('DATABASE', database);


    // SOCKET.IO //////////////////////////

    let turn;
    // turn = 0 - opponent turn
    // turn = 1 - player turn

    socket.emit('whoStarts');
    socket.on('whoStarts', (who) => {
        if (who === 0) {
            turn = 1;
            infoContainerDOM.innerHTML = yourMoveMsg;
        } else if (who === 1) {
            turn = 0;
            infoContainerDOM.innerHTML = opponentsMoveMsg;
        }
    })

    let clicked = [];

    opponentField.field.addEventListener('click', (evt) => {
        if (evt.target.className === 'col') {

            if (turn === 1) {
                clicked = [];
                const row = +evt.target.parentElement.dataset.id.replace('row', '');
                const col = +evt.target.dataset.id.replace('col', '');

                clicked.push(row);
                clicked.push(col);

                socket.emit('target', clicked);
            } else if (turn === 0) {
                infoContainerDOM.innerHTML = opponentsMoveMsg;
            }

        }
    })

    socket.on('notReady', () => {
        containerDOM.innerHTML = '<h2>Opponent not ready! Please wait!</h2>'
    })

    socket.on('hitOrMiss', (msg) => {
        turn = 0;
        containerDOM.innerHTML = '';
        infoContainerDOM.innerHTML = opponentsMoveMsg;

        let cell = opponentField.subElements[`row${clicked[0]}`].childNodes[clicked[1]];

        if (msg === 'hit') {
            cell.innerText = 'X'
            cell.classList.add('hit');
        } else if (msg === 'miss') {
            cell.classList.add('miss')
        }

        clicked = [];

    })


    // RECEIVING DATA
    socket.on('target', (coords) => {
        turn = 1;
        containerDOM.innerHTML = '';
        infoContainerDOM.innerHTML = yourMoveMsg;

        let hit = false;

        database.forEach(el => {
            el.forEach((cell, index) => {
                if (cell[0] === coords[0] && cell[1] === coords[1]) {
                    el.splice(index, 1);

                    socket.emit('hitOrMiss', 'hit');
                    hit = true;
                }
            })
        })

        if (!hit) {
            socket.emit('hitOrMiss', 'miss');
        }
    });

}

class DrawingLogic {

    configuration = {
        normal: {
            size: 10,
            ships: {
                3: 2,
                2: 1,
                1: 1
            }
        },
        arena: {
            size: 5,
            ships: {
                1: 3
            }
        },
        bigOcean: {
            size: 15,
            ships: {
                9: 3,
                3: 4,
                1: 1
            }
        }
    };

    state = {
        draw: false,
        clicked: {
            row: null,
            col: null
        },
        targets: [],
        size: null,
        ship: [],
        vector: null,
        direction: null,
        selectedShip: [],
        pointer: {
            down: null,
            up: null,
            move: null
        },
        collision: null
    };

    shipsCounter = {
        // all ships
        total: 0
    };

    field;
    subElements;
    onlyFieldSubElements;
    info;

    database = {};

    // all collisions
    collisions = [];

    constructor(mode) {
        this.mode = mode;
        this.n = this.configuration[mode].size;

        const {field, subElements} = createField(this.n);

        this.field = field;
        this.subElements = subElements;
        this.onlyFieldSubElements = subElements;
        this.generateDatabase();
        this.generateInfo();
        this.getSubElements();
        this.addEventListeners();
    }

    getSubElements() {

        const obj = {...this.subElements};
        const infoElements = this.info.querySelectorAll('[data-id]');

        for (const element of infoElements) {
            obj[element.dataset.id] = element;
        }

        this.subElements = {...obj};
    }

    generateInfo() {

        const el = document.createElement('div');
        const ships = this.shipsCounter;

        for (const element in ships) {
            if (element !== 'total') {
                //creating info
                const squares = document.createElement('div');
                squares.className = 'infoShip'
                const square = document.createElement('div');
                square.className = 'infoCell';
                squares.dataset.id = element + '-size';
                for (let i = 0; i < element; i++) {
                    squares.appendChild(square.cloneNode(true));
                }


                const paragraph = document.createElement('div');
                paragraph.innerText = ships[element];
                paragraph.dataset.id = element + '-counter';
                squares.appendChild(paragraph)

                el.appendChild(squares);
            }

        }

        this.info = el;

    }

    generateDatabase() {
        const ships = this.configuration[this.mode].ships;
        // database
        for (const element in ships) {
            this.database[element] = [];
        }

        //ships counter
        for (const element in ships) {
            this.shipsCounter[element] = ships[element];
            this.shipsCounter['total'] += ships[element];
        }
    }


    // return cell in DOM
    getCell(row, col) {
        return this.subElements[`row${row}`].childNodes[col];
    }

    addEventListeners() {

        const setClicked = (evt) => {
            if (evt.target.className.includes('col')) {
                const row = +evt.target.parentElement.dataset.id.replace('row', '');
                const col = +evt.target.dataset.id.replace('col', '');
                this.state.clicked = {row: row, col: col};
            }
        }

        // Start drawing by clicking on ship
        this.info.addEventListener('click', evt => {
            if (evt.target.className === 'infoCell' && !this.state.draw) {
                this.state.size = +evt.target.parentElement.dataset.id.replace('-size', '');

                if (this.shipsCounter[this.state.size] > 0 && !this.state.draw) {
                    this.state.draw = true;
                    this.state.selectedShip = this.subElements[`${this.state.size}-size`];

                    this.toggleClassSelectedShip();

                }
            }
        });

        // Remove on click
        this.field.addEventListener('dblclick', evt => {
            if (evt.target.className.includes('ship')) {
                const row = +evt.target.parentElement.dataset.id.replace('row', '');
                const col = +evt.target.dataset.id.replace('col', '');

                this.state.clicked = {row: row, col: col};

                if (!this.state.draw) {
                    this.deleteShip();
                }
            }
        });

        // Dragging
        this.field.addEventListener('pointerdown', evt => {
            if (this.state.draw) {
                setClicked(evt);
                this.state.pointer.down = evt.target

                this.drawShip(evt.target);
            }
        });

        this.field.addEventListener('pointerup', evt => {
            if (this.state.draw) {
                this.state.pointer.up = evt.target
            }
        });

        this.field.addEventListener('pointermove', evt => {
            if (this.state.draw && this.state.pointer.down && !this.state.pointer.up) {

                if (this.state.pointer.move !== evt.target && this.state.pointer.down !== evt.target) {
                    setClicked(evt);
                    this.state.pointer.move = evt.target;
                    this.drawShip(evt.target);
                }
            }
        });


    }

    deleteShip() {

        const coordinates = JSON.stringify([this.state.clicked.row, this.state.clicked.col]);
        let ship;

        // Find ship in database
        for (const el in this.database) {
            if (this.database[el].length > 0) {

                this.database[el].forEach(el2 => {
                    const string = JSON.stringify(el2.ship);
                    if (string.includes(coordinates)) {
                        ship = el2;
                        const index = this.database[el].indexOf(ship);

                        // deleting from database
                        this.database[el].splice(index, 1);
                    }
                })
            }
        }

        // Remove classes
        ship.ship.forEach(el => this.getCell(...el).classList.remove('ship'));
        ship.collision.forEach(el => this.getCell(...el).classList.remove('collision'));


        // Updating database
        this.collisions = this.collisions.filter(el => {
            if (!ship.collision.includes(el)) {
                return el
            }
        })
        this.shipsCounter[ship.ship.length]++;
        this.shipsCounter.total++;

        // Decreasing the counter
        const counter = `${ship.ship.length}-counter`
        this.subElements[counter].innerText = this.shipsCounter[ship.ship.length]

        // Refresh collisions and reset state
        this.drawCollision();
        this.resetState();

    }


    toggleClassSelectedShip() {
        this.state.selectedShip.childNodes.forEach(el => {
            if (el.classList.contains('infoCell')) {
                el.classList.toggle('selectedInfoShip');
            }
        });
    }


    drawShip(target) {

        const validate = this.validate(target);
        if (this.state.size > 0 && validate) {

            this.state.targets.push(target);
            const row = this.state.clicked.row;
            const col = this.state.clicked.col;
            const arrayLength = this.state.ship.length;

            // first ship cell
            if (arrayLength === 0) {
                target.classList.add('ship');
                this.state.ship.push([row, col]);
                this.state.size--;

            } else {
                const lastEl = this.state.ship[arrayLength - 1];
                let isNextInRow = (lastEl[1] + 1 === col || lastEl[1] - 1 === col) && lastEl[0] === row;
                let isNextInCol = (lastEl[0] + 1 === row || lastEl[0] - 1 === row) && lastEl[1] === col;

                // checking direction
                if (isNextInRow && !this.state.vector) {
                    if (lastEl[1] + 1 === col) {
                        this.state.direction = 'right';
                    } else {
                        this.state.direction = 'left';
                    }
                    this.state.vector = 'horizontally';

                } else if (isNextInCol && !this.state.vector) {
                    if (lastEl[0] + 1 === row) {
                        this.state.direction = 'down';
                    } else {
                        this.state.direction = 'up';
                    }
                    this.state.vector = 'vertically';
                }

                switch (this.state.direction) {
                    case 'right':
                        isNextInRow = lastEl[1] + 1 === col;
                        break;
                    case 'left':
                        isNextInRow = lastEl[1] - 1 === col;
                        break;
                    case 'up':
                        isNextInCol = lastEl[0] - 1 === row;
                        break;
                    case 'down':
                        isNextInCol = lastEl[0] + 1 === row;
                        break;
                }

                if (lastEl[0] === row && isNextInRow && this.state.vector === 'horizontally') {
                    target.classList.add('ship');
                    this.state.ship.push([row, col]);
                    this.state.size--;
                }
                if (lastEl[1] === col && isNextInCol && this.state.vector === 'vertically') {
                    target.classList.add('ship');
                    this.state.ship.push([row, col]);
                    this.state.size--;
                }

            }

            // ship completed
            if (this.state.size === 0) {
                this.createCollision();
                this.drawCollision();
                this.pushShipToDatabase();
            }
        }

        // if not validate
        if (!validate) {
            this.collisionHandler();
        }

    }


    validate(target) {

        // can't be outside of the matrix
        if (target.className === 'tables' || this.state.clicked.row === 0 || this.state.clicked.col === 0) {
            return false;
        }

        // can't be on collision
        const el = JSON.stringify([this.state.clicked.row, this.state.clicked.col]);
        const array = JSON.stringify(this.collisions);

        if (array.includes(el)) {
            return false
        }

        return true;

    }

    collisionHandler() {

        // remove classes
        if (this.state.targets) {
            this.state.targets.forEach(el => {
                el.classList.remove('ship');
            })
        }

        this.resetState()
        this.toggleClassSelectedShip();
    }

    createCollision() {
        // sorting
        if (this.state.vector === 'horizontally') {
            this.state.ship.sort(function (a, b) {
                return a[1] > b[1] ? 1 : -1;
            });
        } else {
            this.state.ship.sort(function (a, b) {
                return a[0] > b[0] ? 1 : -1;
            });
        }

        // collision
        this.state.collision = this.goAroundTheShip()
            .reduce((result, el) => {
                // can't be outside of the field
                if (el[0] !== 0 && el[1] !== 0 && el[0] <= this.n && el[1] <= this.n) {
                    result.push(el);
                }
                return result;
            }, [])

        this.collisions.push(...this.state.collision);
    }


    drawCollision() {
        this.collisions.forEach(el => this.getCell(...el).classList.add('collision'));
    }


    goAroundTheShip() {

        const collision = []

        if (this.state.vector === 'horizontally' || !this.state.vector) {

            const firstCell = this.state.ship[0];
            const startingPoint = [firstCell[0] - 1, firstCell[1] - 1];

            let row = startingPoint[0];
            let col = startingPoint[1];

            for (let i = 0; i < 3; i++) {
                for (let i = 0; i <= this.state.ship.length + 1; i++) {
                    collision.push([row, col])
                    col++;
                }
                col = startingPoint[1];
                row++;

            }
        }

        if (this.state.vector === 'vertically') {

            const firstCell = this.state.ship[0];
            const startingPoint = [firstCell[0] - 1, firstCell[1] - 1];

            let row = startingPoint[0];
            let col = startingPoint[1];

            for (let i = 0; i < 3; i++) {
                for (let i = 0; i <= this.state.ship.length + 1; i++) {
                    collision.push([row, col])
                    row++;
                }
                row = startingPoint[0];
                col++;

            }
        }

        return collision;

    }


    resetState() {
        this.state.draw = false;
        this.state.targets = [];
        this.state.size = null;
        this.state.ship = [];
        this.state.vector = null;
        this.state.direction = null;
        this.state.pointer.down = null;
        this.state.pointer.up = null;
        this.state.pointer.move = null;
        this.state.collision = null;
    }

    pushShipToDatabase() {

        const newShip = {
            ship: this.state.ship,
            collision: this.state.collision
        }

        // Updating database
        this.database[this.state.ship.length].push(newShip);
        this.shipsCounter[this.state.ship.length]--;
        this.shipsCounter.total--;

        // Decreasing the counter
        const counter = `${this.state.ship.length}-counter`
        this.subElements[counter].innerText = this.shipsCounter[this.state.ship.length]

        // Removing collisions when all ships are placed
        if (this.shipsCounter.total === 0) {
            this.collisions.forEach(el => this.getCell(...el).classList.remove('collision'));

            this.startGame();
        }

        // Resetting the state
        this.resetState();

        this.toggleClassSelectedShip();

    }

    startGame() {
        const field = this.field.cloneNode(true);
        const readyDatabase = [];
        const subElements = this.onlyFieldSubElements;

        for (const element in this.database) {
            for (const el in this.database[element]) {
                const ship = this.database[element][el].ship
                readyDatabase.push(ship);
            }
        }

        startGame({field, subElements}, readyDatabase);
    }


}

prepareNewGame();