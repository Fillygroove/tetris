let divBoard = document.getElementById('board');
let pauseDiv = document.getElementById('pause');
let nextDiv = document.getElementById('next-main');
let holdDiv;
let gameLoop;
let game;
let config;
let blankRow;

document.addEventListener("keydown", (e) => {
    for (let key in config.control) {
        if (config.control[key].key == e.key) {
            if (!config.control[key].buffer) {
                config.control[key].pressed = 1;
            }
        }
    }
});

document.addEventListener("keyup", (e) => {
    for (let key in config.control) {
        if (config.control[key].key == e.key) {
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
    }
    
    draw() {
        for (let indices of this.indices) {
            let pixel = divBoard.children[indices.col].children[indices.row];
            pixel.className = 'game-col';
            pixel.style.width = `${100 / config.dims.width}%`;
    
            drawPixel(pixel, indices.color);
        }
    }
    
    erase() {
        for (let indices of this.indices) {
            let pixel = divBoard.children[indices.col].children[indices.row];
            pixel.className = 'game-col';
            pixel.style.width = `${100 / config.dims.width}%`;
    
            drawPixel(pixel, '#333333');
        }
    }

    remove() {
        this.indices = undefined;
        this.center = undefined;
        this.index = undefined;
    }

    exists() {
        return this.indices != undefined && this.center != undefined && this.index != undefined;  
    }

    set(minoID) {
        if (this.exists()) this.erase();

        let mino = config.minos[minoID];
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
                indexArray.row < 0 || indexArray.row > config.dims.width -1 ||
                // or if it didn't pass TTC SRS checks...
                check > 4
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

    move(x, y) {
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

function shadeColor(color, percent) {
    var R = parseInt(color.substring(1,3),16);
    var G = parseInt(color.substring(3,5),16);
    var B = parseInt(color.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

function drawPixel(pixel, color) {
    // Kill the child.
    pixel.innerHTML = '';
    pixel.style.backgroundColor = color;

    // Utter jank. I should base it off of tetromino index and not color.
    if (color != '#333333') {
        if (pixel.children.length == 0) {
            let mino = document.createElement('div');
            mino.className = 'game-mino';
            mino.style.backgroundColor = color;

            pixel.append(mino);
        }

        pixel.style.backgroundColor = shadeColor(color, -40);
    }
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
    if (nextDiv) {
        drawInDiv(nextDiv, game.next);
    }
}

function drawHold() {
    if (holdDiv && game.hold != undefined) {
        drawInDiv(holdDiv, game.hold);
    }
}

function pause() {
    if (!game.paused) {
        divBoard.style.visibility = 'hidden';
        pauseDiv.style.visibility = 'visible';

        if (nextDiv) nextDiv.innerHTML = '';
        if (holdDiv) holdDiv.innerHTML = '';

        game.paused = true;
    } else {
        divBoard.style.visibility = 'visible';
        pauseDiv.style.visibility = 'hidden';
        drawNext();
        drawHold();
        game.paused = false;    
    }
}

function resetGame() {
    // Set game object back to defaults, based off of the configuated inputs
    game = {
        board: ((out = []) => {
            for (let i = 0; i < config.dims.height; i++) {
                out.push(new Array(config.dims.width).fill(0));
            }
            return out;
        })(),
        linesCleared: [],
        piece: new Piece(),
        next: Math.floor(Math.random() * config.minos.length),
        hold: undefined,
        done: undefined,
        paused: false,
        placeBuffer: 0,
        timer: 0,
        speed: 2
    };

    // Change the aspect ratio of the board based on the width and height
    if (config.dims.width / config.dims.height > 2) {
        divBoard.style.width = pauseDiv.style.width = `100%`;
        divBoard.style.height = pauseDiv.style.height = `${50 * config.dims.height / config.dims.width}%`;
    } else {
        divBoard.style.width = pauseDiv.style.width = `${200 * config.dims.width / config.dims.height}%`;
        divBoard.style.height = pauseDiv.style.height = `100%`;
    }
    
    // Just in case there is anything displayed on the board, remove it
    divBoard.innerHTML = '';
    divBoard.style.visibility = 'visible';
    pauseDiv.style.visibility = 'hidden';

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

    // If hold is enabled, add it
    if (config.enableHold) {
        let holdText = document.createElement('p');
        holdText.id = 'div-text';
        holdText.innerHTML = 'Hold';

        holdDiv = document.createElement('div');
        holdDiv.id = 'hold-main';

        document.getElementById('left-wrapper').append(holdText, holdDiv);
    } else document.getElementById('left-wrapper').innerHTML = '';

    // If next count is above 0, add 
    if (config.nextAmount) {
        let nextText = document.createElement('p');
        nextText.id = 'div-text';
        nextText.innerHTML = 'Next';

        nextDiv = document.createElement('div');
        nextDiv.id = 'hold-main';

        document.getElementById('right-wrapper').append(nextText, nextDiv);
    } else document.getElementById('right-wrapper').innerHTML = '';
    
    /*
        <p id="div-text">Hold</p>
        <div id="hold-main"></div>
    */
}

function gameInit(options = config) {
    config = options;
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
                if (game.done) clearInterval(gameLoop);

                if (!game.piece.exists()) {
                    game.piece.set(game.next);
                    game.next = Math.floor(Math.random() * config.minos.length);
                    drawNext();
                } else {
                    // Increment the timer
                    game.timer = (game.timer + 1) % 60;

                    // Move the piece down from time to time
                    if (game.timer % Math.round(60 / game.speed) == 0) {
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
    name: 'U',
    color: ['#E90BC6'],
    shape: [
        [0, 0, 1],
        [0, 0, 1],
        [1, 1, 1]
    ]
}/*, {
    name: 'Funyun',
    color: ['#FF8317'], // #029457 // #462820
    shape: [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1]
    ]
}*/, {
    name: 'O',
    color: ['#930571'],
    shape: [
        [1, 1],
        [1, 1]
    ]
}/*, {
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
}*//*, {
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
}*//*, {
    name: 'Lihns',
    color: ['#3D9AB2'],
    shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
}*//*, {
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
}*/];
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
    name: `Drifter's Piece`,
    color: ['#72A8FE'],
    shape: [
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [1, 0, 0, 0]
    ]
}, {
    name: 'logo',
    color: ['#FF8833', '#FF88EE', '#FEFCBB', '#01F001'],
    shape: [
        [0, 3, 0],
        [1, 2, 4],
        [0, 0, 0]
    ]
}];

gameInit({
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
            key: 'Enter',
            pressed: 0,
            buffer: 0
        },
        hold: {
            execute: () => {
                if (config.enableHold) {
                    let holdTemp = game.hold;
                    game.hold = game.piece.index;
                    drawHold();
                    game.piece.erase();
                    
                    if (holdTemp == undefined) game.piece.remove();
                    else game.piece.set(holdTemp);
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
    garbage: 0,
    enableHold: true,
    nextAmount: 1
});
