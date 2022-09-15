let divBoard = document.getElementById('board');
let pauseDiv = document.getElementById('pause');
let nextDiv = document.getElementById('main-hold');
let gameLoop;
let game;
let board;

document.addEventListener("keydown", (e) => {
    for (let key in game.control) {
        if (game.control[key].key == e.key) {
            if (!game.control[key].buffer) {
                game.control[key].pressed = 1;
            }
        }
    }
});

document.addEventListener("keyup", (e) => {
    for (let key in game.control) {
        if (game.control[key].key == e.key) {
            game.control[key].pressed = 0;
            game.control[key].buffer = game.control[key].buffer == undefined ? undefined : 0;
        }
    }
});

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

function drawPiece() {
    for (let indices of game.piece.indices) {
        let pixel = divBoard.children[indices.col].children[indices.row];
        pixel.className = 'game-col';
        pixel.style.width = `${100 / game.dims.width}%`;

        drawPixel(pixel, indices.color);
    }
}

function erasePiece() {
    for (let indices of game.piece.indices) {
        let pixel = divBoard.children[indices.col].children[indices.row];
        pixel.className = 'game-col';
        pixel.style.width = `${100 / game.dims.width}%`;
        
        drawPixel(pixel, '#333333');
    }
}

function drawNext(mino) {
    nextDiv.innerHTML = '';

    for (let i = 0; i < mino.shape.length; i++) {
        let holdRow = document.createElement('div');
        holdRow.className = 'hold-row';
        holdRow.style.height = `${100 / mino.shape[i].length}%`;

        for (let j = 0; j < mino.shape[i].length; j++) {
            let holdCol = document.createElement('div');
            holdCol.className = 'hold-col';
            holdCol.style.width = `${100 / mino.shape[i].length}%`;

            if (mino.shape[i][j]) {
                drawPixel(holdCol, mino.color[mino.shape[i][j] - 1]);
            }

            holdRow.append(holdCol);
        }

        nextDiv.append(holdRow);
    }
};

function setPiece() {
    let mino;

    if (!game.next) {
        mino = game.minoes[Math.floor(Math.random() * game.minoes.length)];
    } else {
        mino = game.next;
    }

    game.next = game.minoes[Math.floor(Math.random() * game.minoes.length)];

    drawNext(game.next);

    let leftmost = Math.floor((game.dims.width - mino.shape.length) / 2);

    game.timer = 0;
    game.piece = {
        indices: ((out = []) => {
            for (let i = 0; i < mino.shape.length; i++) {
                for (let j = 0; j < mino.shape.length; j++) {
                    if (mino.shape[i][j]) {
                        out.push({
                            col: i, 
                            row: j + leftmost,
                            color: mino.color[mino.shape[i][j] - 1]
                        });
                        if (board[i][j + leftmost]) game.done = 'lost';
                    }
                }
            }

            return out;
        })(),
        center: [
            (mino.shape.length - 1) / 2,
            leftmost + (mino.shape.length - 1) / 2
        ]
    };

    drawPiece();
}

function rotatePiece(dir, check = 0) {
    // If I just redefined the piece indices, the code breaks; I do not know why. 
    let newIndices = [];

    for (let i = 0; i < game.piece.indices.length; i++) {
        // Move the x and y positions of the indices to (0, 0) instead of their current center
        let y = game.piece.indices[i].col - game.piece.center[0];
        let x = game.piece.indices[i].row - game.piece.center[1];
        
        // Calculate how far away they are from the center and what angle they're at from the center
        let scale = Math.sqrt(y * y + x * x);
        let angle = Math.atan2(x, y);

        // Rotate the x and the y pieces clockwise or widdershins
        let indexArray = {
            col: Math.round(scale * Math.cos(angle - dir * Math.PI / 2) + game.piece.center[0]), 
            row: Math.round(scale * Math.sin(angle - dir * Math.PI / 2) + game.piece.center[1]),
            color: game.piece.indices[i].color
        };

        if (
            // The attempted rotation location exists...
            board[indexArray.col][indexArray.row] ||
            // or if that location is out of bounds...
            indexArray.col < 0 || indexArray.col > game.dims.height -1 ||
            indexArray.row < 0 || indexArray.row > game.dims.width -1 ||
            // or if it didn't pass TTC SRS checks...
            check > 4
        ) {
            // Do not rotate
            // Implement TTC SRS by adjusting the centerpoint, allowing for four extra checks
            return;
        }

        newIndices.push(indexArray);
    }

    erasePiece();
    game.piece.indices = newIndices;
    drawPiece();
}

function movePiece(x, y) {
    let newIndices = [];

    for (let i = 0; i < game.piece.indices.length; i++) {
        let newY = game.piece.indices[i].col + y;
        let newX = game.piece.indices[i].row + x;

        if (!board[newY] || board[newY][newX]) {
            if (y != 0) {
                if (game.placeBuffer) {
                    for (let i = 0; i < game.piece.indices.length; i++) {
                        board[game.piece.indices[i].col][game.piece.indices[i].row] = 1;
                        if (!board[game.piece.indices[i].col].includes(0)) {
                            if (!game.linesCleared.includes(game.piece.indices[i].col)) {
                                game.linesCleared.push(game.piece.indices[i].col);
                            }
                        }
                    }
                    game.piece = undefined;
                    game.placeBuffer = 0;
                } else {
                    game.placeBuffer = 1;
                }
            }
            return;
        } else if (newX < 0 || newX > game.dims.width - 1) {
            return;
        }

        newIndices.push({
            col: newY,
            row: newX,
            color: game.piece.indices[i].color
        });
    }

    erasePiece();

    if (game.placeBuffer) game.placeBuffer = 0;

    game.piece.indices = newIndices;
    game.piece.center[0] += y;
    game.piece.center[1] += x;
    
    drawPiece();
}

function pause() {
    if (!game.paused) {
        divBoard.style.visibility = 'hidden';
        pauseDiv.style.visibility = 'visible';
        nextDiv.innerHTML = '';
        game.paused = true;
    } else {
        divBoard.style.visibility = 'visible';
        pauseDiv.style.visibility = 'hidden';
        drawNext(game.next);
        game.paused = false;    
    }
}

function gameInit(options) {
    game = options;
    board = ((out = []) => { // Merge this with the game object
        for (let i = 0; i < game.dims.height; i++) {
            out.push(new Array(game.dims.width).fill(0));
        }
        
        return out;
    })();
    
    if (game.dims.width / game.dims.height > 2) {
        divBoard.style.width = pauseDiv.style.width = `100%`;
        divBoard.style.height = pauseDiv.style.height = `${50 * game.dims.height / game.dims.width}%`;
    } else {
        divBoard.style.width = pauseDiv.style.width = `${200 * game.dims.width / game.dims.height}%`;
        divBoard.style.height = pauseDiv.style.height = `100%`;
    }
    
    divBoard.innerHTML = '';
    divBoard.style.visibility = 'visible';
    pauseDiv.style.visibility = 'hidden';

    for (let i = 0; i < game.dims.height; i++) {
        let row = document.createElement('div');
        row.className = 'game-row';
        row.id = `row${i}`;
        row.style.height = `${100 / game.dims.height}%`;
    
        for (let j = 0; j < game.dims.width; j++) {
            let col = document.createElement('div');
            col.className = 'game-col';
            col.id = `col${j}`;
            col.style.width = `${100 / game.dims.width}%`;
    
            row.append(col);
        }
    
        divBoard.append(row);
    }
    
    let blankRow = divBoard.children[0].innerHTML; 
    
    if (gameLoop) clearInterval(gameLoop);
    
    gameLoop = setInterval(() => {
        if (game.paused) {
            // to do: rewrite as an event listener instead of something that's executed every frame
            if (game.control.pause.pressed) {
                game.control.pause.pressed = 0;
                
                if (game.control.pause.buffer != undefined) {
                    game.control.pause.buffer = 1;
                }

                pause();
            }
        } else {
            if (game.linesCleared.length == 0) {
                // If the game is completed, stop the loop
                if (game.done) clearInterval(gameLoop);

                if (!game.piece) setPiece();
                else {
                    // Increment the timer
                    game.timer = (game.timer + 1) % 60;

                    // Move the piece down from time to time
                    if (game.timer % Math.round(60 / game.speed) == 0) {
                        movePiece(0, 1);
                    }
                }

                // Control manager
                for (let control in game.control) {
                    if (game.control[control].pressed) {
                        game.control[control].pressed = 0;
                        
                        if (game.control[control].buffer != undefined) {
                            game.control[control].buffer = 1;
                        }

                        game.control[control].execute();
                        break;
                    }
                }
            } else {
                // Sort line indices from smallest to largest; Ensures that no bugs happen when the above lines are dropped down
                game.linesCleared.sort((a, b) => (a - b));

                for (let i = 0; i < game.linesCleared.length; i++) {
                    // Clear line; No need to redraw since it's going to get overwritten anyway
                    board[game.linesCleared[i]].fill(0);

                    // Move everything from above that line down
                    for (let j = game.linesCleared[i] - 1; j > -1; j--) {
                        divBoard.children[j + 1].innerHTML = divBoard.children[j].innerHTML;
                        divBoard.children[j].innerHTML = blankRow;

                        // Shallow copies suck.
                        for (let k = 0; k < board[j].length; k++) {
                            board[j + 1][k] = board[j][k];
                        }

                        board[j].fill(0);
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
}/*, {
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
        [0, 1, 1, 1, 0]
        [0, 0, 0, 0, 0],
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
    minoes: [...standardMinos],
    dims: {
        width: 10,
        height: 20
    },
    control: {
        left: {
            execute: () => {
                movePiece(-1, 0);
            },
            key: 'a',
            pressed: 0
        },
        right: {
            execute: () => {
                movePiece(1, 0);
            },
            key: 'd',
            pressed: 0
        },
        hdrop: {
            execute: () => {
                while (game.piece) movePiece(0, 1);
            },
            key: 'w',
            pressed: 0,
            buffer: 0
        },
        down: {
            execute: () => {
                movePiece(0, 1);
            },
            key: 's',
            pressed: 0
        },
        ccw: {
            execute: () => {
                rotatePiece(-1);
            },
            key: 'j',
            pressed: 0,
            buffer: 0
        },
        cw: {
            execute: () => {
                rotatePiece(1);
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
        }
    },
    linesCleared: [],
    piece: undefined,
    next: undefined,
    done: undefined,
    paused: false,
    placeBuffer: 0,
    timer: 0,
    speed: 2,
});