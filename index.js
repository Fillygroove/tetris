let divBoard = document.getElementById('game-board');
let leftWrapper = document.getElementById('left-wrapper');
let rightWrapper = document.getElementById('right-wrapper');
let holdDiv;
let gameLoop;
let game;
let blankRow;

for (let input of document.getElementsByTagName('input')) {
    if (input.min && input.max) {
        input.oninput = () => {
            if (Number(input.value) < Number(input.min)) input.value = input.min;
            if (Number(input.value) > Number(input.max)) input.value = input.max;
        }
    }
}

window.onkeydown = (e) => {
    return e.key != ' ' && e.key != 'ArrowUp' && e.key != 'ArrowDown';
}

document.addEventListener("keydown", (e) => {
    for (let key in config.control) {
        if (config.control[key].key == e.key.toLowerCase()) {
            if (!config.control[key].buffer) {
                config.control[key].pressed = 1;
            }
        }
    }
});

document.addEventListener("keyup", (e) => {
    for (let key in config.control) {
        if (config.control[key].key == e.key.toLowerCase()) {
            config.control[key].pressed = 0;
            config.control[key].buffer = config.control[key].buffer == undefined ? undefined : 0;
        }
    }
});

class Piece {
    constructor() {
        this.indices;
        this.center;
        this.index;
        this.shadow;
    }
    
    eraseShadow() {
        if (config.pieceShadows) {
            for (let i = 0; i < this.shadow.length; i++) {
                let pixel = divBoard.children[this.shadow[i]].children[this.indices[i].row];
                pixel.className = 'game-col';
                pixel.style.width = `${100 / config.dims.width}%`;
        
                drawPixel(pixel, '');
            }
        }
    }

    drawShadow() {
        if (config.pieceShadows) {
            let shadow = ((out = []) => {
                for (let i = 0; i < this.indices.length; i++) {
                    out.push(this.indices[i].col);
                }
                return out;
            })();
            let indices = this.indices;

            (function dropLoop() {
                let newIndices = [];

                for (let i = 0; i < shadow.length; i++) {
                    let newY = shadow[i] + 1;

                    if (newY > config.dims.height - 1 || game.board[newY][indices[i].row]) {
                        return;
                    } else newIndices.push(newY);
                }

                shadow = newIndices;

                dropLoop();
            })();

            this.shadow = shadow;

            for (let i = 0; i < this.shadow.length; i++) {
                let pixel = divBoard.children[this.shadow[i]].children[this.indices[i].row];
                pixel.className = 'game-col';
                pixel.style.width = `${100 / config.dims.width}%`;

                drawPixel(pixel, this.indices[i].color + '20', true);
            }
        }
    }

    draw() {
        this.drawShadow();

        for (let indices of this.indices) {
            let pixel = divBoard.children[indices.col].children[indices.row];
            pixel.className = 'game-col';
            pixel.style.width = `${100 / config.dims.width}%`;
    
            drawPixel(pixel, indices.color);
        }
    }
    
    erase() {
        this.eraseShadow();
        
        for (let indices of this.indices) {
            let pixel = divBoard.children[indices.col].children[indices.row];
            pixel.className = 'game-col';
            pixel.style.width = `${100 / config.dims.width}%`;
    
            drawPixel(pixel, '');
        }
    }

    remove() {
        this.indices = undefined;
        this.center = undefined;
        this.index = undefined;
        this.shadow = undefined;
        game.pieceSwitched = false;
    }

    exists() {
        return this.indices != undefined && this.center != undefined && this.index != undefined;  
    }

    set(minoID) {
        if (this.exists()) this.erase();

        let mino = config.minos[minoID];

        if (Math.random() * 100 + 1 <= config.heavenChance) {
            let firstRowWithPieces = 0;

            while (!game.board[firstRowWithPieces].includes(1) && firstRowWithPieces < config.dims.height - 1) {
                firstRowWithPieces++;
            }

            let heavenShape = ((out = []) => {
                out.push(new Array(config.dims.width).fill(1));
                
                let firstRow = game.board[firstRowWithPieces];
                let indices = [];

                for (let i = 0; i < firstRow.length; i++) {
                    if (!firstRow[i]) indices.push(i);
                }

                for (let i = 0; i < config.dims.width - 1; i++) {
                    let row = new Array(config.dims.width).fill(0);

                    if (firstRowWithPieces + i < config.dims.height && indices.length < config.dims.width) {
                        for (let j = 0; j < indices.length; j++) {
                            if (game.board[firstRowWithPieces + i][indices[j]]) {
                                indices.splice(j, 1);
                                j--;
                            } else row[indices[j]] = 1;
                        }
                    }

                    out.push(row);
                }

                return out;
            })();

            mino = {
                name: 'Heaven',
                color: ['#F23C0D'],
                shape: heavenShape
            }
        }

        let leftmost = Math.floor((config.dims.width - mino.shape.length) / 2);
    
        this.indices = ((out = []) => {
            for (let i = 0; i < mino.shape.length; i++) {
                for (let j = 0; j < mino.shape.length; j++) {
                    if (mino.shape[i][j]) {
                        out.push({
                            col: i, 
                            row: j + leftmost,
                            color: mino.color[mino.shape[i][j] - 1]
                        });
                        if (game.board[i][j + leftmost]) game.done = 'lost';
                    }
                }
            }

            return out;
        })();

        this.center = [
            (mino.shape.length - 1) / 2,
            leftmost + (mino.shape.length - 1) / 2
        ];

        this.index = minoID;

        this.draw();
    }

    rotate(dir, check = 0) { // this could be optimized very easily
        if (this.exists()) {
            // If I just redefined the piece indices, the code breaks; I do not know why. 
            let newIndices = [];

            for (let i = 0; i < this.indices.length; i++) {
                // Move the x and y positions of the indices to (0, 0) instead of their current center
                let y = this.indices[i].col - this.center[0];
                let x = this.indices[i].row - this.center[1];
                
                // Calculate how far away they are from the center and what angle they're at from the center
                let scale = Math.sqrt(y * y + x * x);
                let angle = Math.atan2(x, y);

                // Rotate the x and the y pieces clockwise or widdershins
                let indexArray = {
                    col: Math.round(scale * Math.cos(angle - dir * Math.PI / 2) + this.center[0]), 
                    row: Math.round(scale * Math.sin(angle - dir * Math.PI / 2) + this.center[1]),
                    color: this.indices[i].color
                };

                if (
                    // The attempted rotation location exists...
                    game.board[indexArray.col][indexArray.row] ||
                    // or if that location is out of bounds...
                    indexArray.col < 0 || indexArray.col > config.dims.height -1 ||
                    indexArray.row < 0 || indexArray.row > config.dims.width -1
                ) {
                    // Do not rotate
                    // Implement TTC SRS by adjusting the centerpoint, allowing for four extra checks
                    return;
                }

                newIndices.push(indexArray);
            }

            this.erase();
            this.indices = newIndices;
            this.draw();
        }
    }

    move(x, y) {
        if (this.exists()) {
            let newIndices = [];

            for (let i = 0; i < this.indices.length; i++) {
                let newY = this.indices[i].col + y;
                let newX = this.indices[i].row + x;
        
                if (!game.board[newY] || game.board[newY][newX]) {
                    if (y != 0) {
                        if (game.placeBuffer) {
                            for (let i = 0; i < this.indices.length; i++) {
                                game.board[this.indices[i].col][this.indices[i].row] = 1;
                                if (!game.board[this.indices[i].col].includes(0)) {
                                    if (!game.linesCleared.includes(this.indices[i].col)) {
                                        game.linesCleared.push(this.indices[i].col);
                                    }
                                }
                            }
                            this.remove();
                            game.placeBuffer = 0;
                        } else {
                            game.placeBuffer = 1;
                        }
                    }
                    return;
                } else if (newX < 0 || newX > config.dims.width - 1) {
                    return;
                }
        
                newIndices.push({
                    col: newY,
                    row: newX,
                    color: this.indices[i].color
                });
            }
            
            this.erase();

            if (game.placeBuffer) game.placeBuffer = 0;
        
            this.indices = newIndices;
            this.center[0] += y;
            this.center[1] += x;
            
            this.draw();
        }
    }
}

function shadeColor(color, percent) {
    var R = parseInt(color.substring(1,3),16);
    var G = parseInt(color.substring(3,5),16);
    var B = parseInt(color.substring(5,7),16);
    var A = color.substring(7,9);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB+A;
}

function drawPixel(pixel, color, isGhost = false) {
    pixel.innerHTML = '';
    pixel.style.backgroundColor = color;

    let mino = document.createElement('div');
    mino.className = 'game-mino';
    mino.style.backgroundColor = color;
    if (isGhost) mino.style.border = `3px ${shadeColor(color + '40', 100)} dashed`;

    pixel.append(mino);

    if (color != '') pixel.style.backgroundColor = shadeColor(color, -40);
}

function drawInDiv(div, minoID) {
    let mino = config.minos[minoID];
    div.innerHTML = '';

    for (let i = 0; i < mino.shape.length; i++) {
        let divRow = document.createElement('div');
        divRow.className = 'div-row';
        divRow.style.height = `${100 / mino.shape[i].length}%`;

        for (let j = 0; j < mino.shape[i].length; j++) {
            let divCol = document.createElement('div');
            divCol.className = 'div-col';
            divCol.style.width = `${100 / mino.shape[i].length}%`;

            if (mino.shape[i][j]) {
                drawPixel(divCol, mino.color[mino.shape[i][j] - 1]);
            }

            divRow.append(divCol);
        }

        div.append(divRow);
    }
}

function drawNext() {
    if (config.nextAmount) {
        for (let i = 0; i < config.nextAmount; i++) {
            drawInDiv(document.getElementById(`next${i}`), game.next[i]);
        }
    }
}

function drawHold() {
    if (config.enableHold && game.hold != undefined) {
        drawInDiv(holdDiv, game.hold);
    }
}

function getSpeed() {
    switch (config.algorithm) {
        case 'nesNTSC':
            if (game.level < 9) return -5 * game.level + 48;
            if (game.level < 19) return 5 - Math.floor(((game.level - 10) / 3));
            if (game.level < 29) return 2;
            return 1;
    }
}

function getScoreFromLines() {
    if (game.linesCleared.length / 3 <= 1) {
        return 200 * game.linesCleared.length - 100;
    } else return 800;
}

function updateScore() {
    document.getElementById('score').innerHTML = `Score: ${String(game.score).padStart(6, 0)}`;
}

function nextLevel() {
    game.timer = 0;
    game.level++;
    game.speed = getSpeed();
    game.linesClearedOverall = 0;
    document.getElementById('level').innerHTML = `Lvl ${game.level}`;
    updateScore();
}

function setDisplay(div, display) {
    document.getElementById(div).style.display = display;
}

function toggleDiv(div) {
    if (document.getElementById(div).style.display == 'initial') {
        setDisplay('main-menu', 'initial');
        setDisplay(div, 'none');
    } else {
        setDisplay('main-menu', 'none');
        setDisplay(div, 'initial');    
    }
}

function showOptions() {
    toggleDiv('options');

    document.getElementById('width').value = config.dims.width;
    document.getElementById('height').value = config.dims.height;
    document.getElementById('heavenChance').value = config.heavenChance;
    document.getElementById('nextAmount').value = config.nextAmount;
    document.getElementById('enableHold').checked = config.enableHold;
    document.getElementById('pieceShadows').checked = config.pieceShadows;
    document.getElementById('switchOnce').checked = config.switchOnce;
    document.getElementById('garbageLines').value = config.garbage.lines;
}

function saveOptions() {
    toggleDiv('options');

    config.dims.width = Number(document.getElementById('width').value);
    config.dims.height = Number(document.getElementById('height').value);
    config.heavenChance = Number(document.getElementById('heavenChance').value);
    config.nextAmount = Number(document.getElementById('nextAmount').value);
    config.enableHold = document.getElementById('enableHold').checked;
    config.pieceShadows = document.getElementById('pieceShadows').checked;
    config.switchOnce = document.getElementById('switchOnce').checked;
    config.garbage.lines = Number(document.getElementById('garbageLines').value);
}

function checkInput() {
    console.log('a')
}

function pause() {
    if (!game.paused) {
        setDisplay('pause', 'initial');

        for (let i = 0; i < config.nextAmount; i++) {
            document.getElementById(`next${i}`).innerHTML = '';
        }

        if (holdDiv) holdDiv.innerHTML = '';

        game.paused = true;
    } else {
        setDisplay('pause', 'none');
        drawNext();
        drawHold();
        game.paused = false;    
    }
}

function quit() {
    clearInterval(gameLoop);

    setDisplay('pause', 'none');
    setDisplay('game-over', 'none');
    setDisplay('main-menu', 'initial');
    divBoard.innerHTML = '';
    leftWrapper.innerHTML = '';
    rightWrapper.innerHTML = '';

    document.getElementById('board').style.width = '100%';
    document.getElementById('board').style.height = '100%';
}

function endGame() {
    clearInterval(gameLoop);

    setDisplay('pause', 'none');
    setDisplay('game-over', 'initial');
}

function resetGame() {
    setDisplay('pause', 'none');
    setDisplay('game-over', 'none');
    setDisplay('main-menu', 'none');

    // Change the aspect ratio of the board based on the width and height
    if (config.dims.width / config.dims.height > 0.5) {
        board.style.width = `100%`;
        board.style.height = `${50 * config.dims.height / config.dims.width}%`;
    } else {
        board.style.width = `${200 * config.dims.width / config.dims.height}%`;
        board.style.height = `100%`;
    }
    
    // Just in case there is anything displayed on the board, remove it
    divBoard.innerHTML = '';

    // Add the required elements to the board
    for (let i = 0; i < config.dims.height; i++) {
        let row = document.createElement('div');
        row.className = 'game-row';
        row.id = `row${i}`;
        row.style.height = `${100 / config.dims.height}%`;
    
        for (let j = 0; j < config.dims.width; j++) {
            let col = document.createElement('div');
            col.className = 'game-col';
            col.id = `col${j}`;
            col.style.width = `${100 / config.dims.width}%`;
    
            row.append(col);
        }
    
        divBoard.append(row);
    }
    
    // Define the blank row used for line clears (this is lazy and needs a rewrite)
    blankRow = divBoard.children[0].innerHTML;

    // Set game object back to defaults, based off of the configuated inputs
    game = {
        board: ((out = []) => {
            for (let i = 0; i < config.dims.height; i++) {
                out.push((() => {
                    let rowArr = new Array(config.dims.width).fill(0);

                    if (// If there is garbage...
                        i > config.dims.height - config.garbage.lines - 1 &&
                        // and if the garbage values are properly defined
                        !(config.garbage.holes + config.garbage.erode > config.dims.width || config.garbage.holes - config.garbage.erode < 1)
                    ) {
                        let plusOrMinus = 2 * (Math.floor(Math.random() * 2) + 1) - 3;
                        let erosion = Math.floor(Math.random() * (config.garbage.erode + 1));

                        let skipOver = ((out = new Array(config.garbage.holes + plusOrMinus * erosion)) => {
                            for (let i = 0; i < out.length; i++) {
                                let outRand = Math.floor(Math.random() * config.dims.width);
                                if (out.includes(outRand)) i--;
                                else out[i] = outRand;
                            }
                            return out;
                        })();

                        for (let j = 0; j < config.dims.width; j++) {
                            if (!skipOver.includes(j)) {
                                let garbColor = (() => {
                                    let color = config.garbage.color;

                                    switch (config.garbage.color) {
                                        case 'random':
                                            color = config.minos[Math.floor(Math.random() * config.minos.length)];
                                            return color.color[Math.floor(Math.random() * color.color.length)];
                                        case 'darkRandom':
                                            color = config.minos[Math.floor(Math.random() * config.minos.length)];
                                            return shadeColor(color.color[Math.floor(Math.random() * color.color.length)], -40);
                                        default:
                                            return color;
                                    }
                                })();

                                drawPixel(divBoard.children[i].children[j], garbColor);
                                rowArr[j] = 1;
                            }
                        }
                    }

                    return rowArr;
                })());
            }
            return out;
        })(),
        linesCleared: [],
        piece: new Piece(),
        next: ((out = []) => {
            for (let i = 0; i < (config.nextAmount || 1); i++) {
                out.push(Math.floor(Math.random() * config.minos.length));
            }
            return out;
        })(),
        pieceSwitched: false,
        hold: undefined,
        done: undefined,
        paused: false,
        placeBuffer: 0,
        timer: 0,
        level: -1,
        score: 0,
        linesClearedOverall: 10,
        speed: undefined
    };

    leftWrapper.innerHTML = '';

    // If hold is enabled, add it
    if (config.enableHold) {
        holdDiv = document.createElement('div');
        holdDiv.className = 'piece-holder';

        leftWrapper.append(holdDiv);
    }

    rightWrapper.innerHTML = '';

    // If next count is above 0, add next piece indicators
    if (config.nextAmount) {
        let nextDiv = document.createElement('div');
        nextDiv.id = 'next-holder';

        for (let i = 0; i < config.nextAmount; i++) {
            let nextDisplay = document.createElement('div');
            nextDisplay.className = 'next-display';
            nextDisplay.id = `next${i}`;

            drawInDiv(nextDisplay, game.next[i]);

            nextDiv.append(nextDisplay);
        }

        rightWrapper.append(nextDiv);
    }

    nextLevel();
}

function gameInit() {
    resetGame();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        if (game.paused) {
            // to do: rewrite as an event listener instead of something that's executed every frame
            if (config.control.pause.pressed) {
                config.control.pause.pressed = 0;
                
                if (config.control.pause.buffer != undefined) {
                    config.control.pause.buffer = 1;
                }

                pause();
            }
        } else {
            if (game.linesCleared.length == 0) {
                // If the game is completed, stop the loop
                if (game.done) endGame();

                if (!game.piece.exists()) {
                    game.piece.set(game.next.shift());
                    game.next.push(Math.floor(Math.random() * config.minos.length));
                    drawNext();
                } else {
                    // Increment the timer
                    game.timer = (game.timer + 1) % game.speed;

                    // Move the piece down from time to time
                    if (game.timer == 0) {
                        game.piece.move(0, 1);
                    }
                }

                // Control manager
                for (let control in config.control) {
                    if (config.control[control].pressed) {
                        config.control[control].pressed = 0;
                        
                        if (config.control[control].buffer != undefined) {
                            config.control[control].buffer = 1;
                        }

                        config.control[control].execute();
                        break;
                    }
                }
            } else {
                // Sort line indices from smallest to largest; Ensures that no bugs happen when the above lines are dropped down
                game.linesCleared.sort((a, b) => (a - b));

                for (let i = 0; i < game.linesCleared.length; i++) {
                    // Clear line; No need to redraw since it's going to get overwritten anyway
                    game.board[game.linesCleared[i]].fill(0);

                    // Move everything from above that line down
                    for (let j = game.linesCleared[i] - 1; j > -1; j--) {
                        divBoard.children[j + 1].innerHTML = divBoard.children[j].innerHTML;
                        divBoard.children[j].innerHTML = blankRow;

                        // Shallow copies suck.
                        for (let k = 0; k < game.board[j].length; k++) {
                            game.board[j + 1][k] = game.board[j][k];
                        }

                        game.board[j].fill(0);
                    }
                }

                game.linesClearedOverall += game.linesCleared.length;
                game.score += getScoreFromLines();
                updateScore();

                // If you have enough score to go to the next level...
                if (game.linesClearedOverall >= 10) nextLevel();

                game.linesCleared = [];
            }
        }
    }, 1000 / 60);
}

let standardMinos = [{
    name: 'I',
    color: ['#00F0F1'],
    shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
}, {
    name: 'J',
    color: ['#0000f0'],
    shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'L',
    color: ['#EF9F00'],
    shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'S',
    color: ['#01F001'],
    shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ]
}, {
    name: 'Z',
    color: ['#F00001'],
    shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'T',
    color: ['#A000F0'],
    shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'O',
    color: ['#F1F000'],
    shape: [
        [1, 1],
        [1, 1]
    ]
}];
let aeroMinos = [{
    name: 'Broque Monsieur',
    color: ['#0DFF72'],
    shape: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1]
    ]
}, {
    name: 'Mino',
    color: ['#FF0D72'],
    shape: [
        [1]
    ]
}, {
    name: 'Linus',
    color: ['#F538FF'],
    shape: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
}, {
    name: 'V',
    color: ['#E90BC6'],
    shape: [
        [0, 0, 1],
        [0, 0, 1],
        [1, 1, 1]
    ]
}, {
    name: 'O',
    color: ['#930571'],
    shape: [
        [1, 1],
        [1, 1]
    ]
}];
let miscMinos = [{
    name: 'O',
    color: ['#F1F000'],
    shape: [
        [0, 1, 1],
        [0, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'wtf',
    color: ['#F0007F'],
    shape: [
        [0, 1, 1, 1, 0],
        [1, 1, 0, 1, 0],
        [0, 1, 1, 0, 0],
        [1, 1, 0, 0, 0],
        [1, 0, 0, 0, 0]
    ]
}, {
    name: 'Heaven Piece',
    color: ['#FFFFFF'],
    shape: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
}, {
    name: 'Diep',
    color: ['#14ACD4', '#959595'],
    shape: [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 1, 1, 2],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
    ]
}, {
    name: 'K',
    color: ['#ED709D'],
    shape: [
        [1, 0, 0, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 0],
        [1, 0, 1, 0]
    ]
}, {
    name: 'logo',
    color: ['#FF8833', '#FF88EE', '#FEFCBB', '#01F001'],
    shape: [
        [0, 3, 0],
        [1, 2, 4],
        [0, 0, 0]
    ]
}, {
    name: `Drifter's Piece`,
    color: ['#72A8FE'],
    shape: [
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [1, 0, 0, 0]
    ]
}, {
    name: `Seasons' Piece`,
    color: ['#B7B7B7', '#999999', '#666666'],
    shape: [
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 2, 0, 2, 2, 2, 2, 0, 2, 0],
        [2, 0, 2, 0, 3, 3, 0, 2, 0, 2],
        [2, 0, 2, 0, 3, 3, 0, 2, 0, 2],
        [2, 0, 2, 0, 3, 3, 0, 2, 0, 2],
        [0, 2, 2, 2, 2, 2, 2, 2, 2, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]
}, {
    name: 'Ґ', // thanks, Cortik
    color: ['#5555f5'],
    shape: [
        [1, 1, 0, 0],
        [0, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
}, {
    name: 'Blitty',
    color: ['#FCFABA'],
    shape: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ]
}, {
    name: 'Broggy',
    color: ['#FCCB3C'],
    shape: [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1]
    ]
}, {
    name: 'Funyun',
    color: ['#FF8317'], // #029457 // #462820
    shape: [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1]
    ]
}, {
    name: 'S',
    color: ['#923852'],
    shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ]
}, {
    name: 'Z',
    color: ['#205983'],
    shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'J',
    color: ['#9E0F22'],
    shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'L',
    color: ['#A33502'],
    shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'Lihns',
    color: ['#3D9AB2'],
    shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
}, {
    name: 'Ghostslayer',
    color: ['#F538FF', '#0DFF72'],
    shape: [
        [0, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 0],
        [1, 2, 1, 2, 1, 0],
        [1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 0],
        [1, 1, 0, 1, 1, 0]
    ]
}, {
    name: '',
    color: ['#f23c0d'],
    shape: [
        [0, 1, 0],
        [1, 0, 1],
        [0, 0, 0]
    ]
}, {
    name: 'amogus',
    color: ['#FF0000', '#00F0F1'],
    shape: [
        [0, 1, 1, 1],
        [1, 1, 2, 2],
        [1, 1, 1, 1],
        [0, 1, 0, 1]
    ]
}, {
    name: 'C',
    color: ['#00F0F1'],
    shape: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: 'Sweetpea',
    color: ['#67764D'],
    shape: [
        [1],
    ]
}, {
    name: '',
    color: ['#f23c0d'],
    shape: [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0]
    ]
}, {
    name: 'Y',
    color: ['#EF2029', '#5965AF', '#F7D308'],
    shape: [
        [0, 1, 0],
        [0, 1, 0],
        [2, 0, 3]
    ]
}, {
    name: 'Long T',
    color: ['#B31564'],
    shape: [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 1]
    ]
}, {
    name: 'Zess',
    color: ['#FFFFFF'],
    shape: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
        [0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0],
        [1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
}];
let triMinos = [{
    name: '',
    color: ['#f23c0d'],
    shape: [
        [0, 1, 0],
        [1, 1, 0],
        [0, 0, 0]
    ]
}, {
    name: '',
    color: ['#f23c0d'],
    shape: [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: '',
    color: ['#f23c0d'],
    shape: [
        [1, 0, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
}, {
    name: '',
    color: ['#f23c0d'],
    shape: [
        [0, 0, 1],
        [1, 1, 0],
        [0, 0, 0]
    ]
}];

let config = {
    control: {
        left: {
            execute: () => {
                game.piece.move(-1, 0);
            },
            key: 'a',
            pressed: 0
        },
        right: {
            execute: () => {
                game.piece.move(1, 0);
            },
            key: 'd',
            pressed: 0
        },
        hdrop: {
            execute: () => {
                while (game.piece.exists()) game.piece.move(0, 1);
            },
            key: 'w',
            pressed: 0,
            buffer: 0
        },
        down: {
            execute: () => {
                game.piece.move(0, 1);
            },
            key: 's',
            pressed: 0
        },
        ccw: {
            execute: () => {
                game.piece.rotate(-1);
            },
            key: 'j',
            pressed: 0,
            buffer: 0
        },
        cw: {
            execute: () => {
                game.piece.rotate(1);
            },
            key: 'k',
            pressed: 0,
            buffer: 0
        },
        pause: {
            execute: () => {
                pause();
            },
            key: 'enter',
            pressed: 0,
            buffer: 0
        },
        hold: {
            execute: () => {
                if (config.enableHold && !game.pieceSwitched) {
                    let holdTemp = game.hold;
                    game.hold = game.piece.index;
                    drawHold();
                    game.piece.erase();
                    
                    if (holdTemp == undefined) game.piece.remove();
                    else game.piece.set(holdTemp);

                    if (config.switchOnce) game.pieceSwitched = true;
                }
            },
            key: 'q',
            pressed: 0,
            buffer: 0
        }
    },
    dims: {
        width: 10,
        height: 20
    },
    minos: [...standardMinos],
    garbage: {
        color: '#999999',
        lines: 0,
        holes: 8,
        erode: 1
    },
    enableHold: true,
    nextAmount: 5,
    pieceShadows: true,
    algorithm: 'nesNTSC',
    heavenChance: 0,
    switchOnce: true
};
