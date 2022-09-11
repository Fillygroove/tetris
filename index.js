let game = {
    done: undefined,
    level: 0,
    lines: 0,
    timer: 0,
    speed: 2,
    linesCleared: [],
    placeBuffer: 0,
    paused: false,
    minoes: [{
        name: 'I',
        color: '#00F0F1',
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    }, {
        name: 'J',
        color: '#0000f0',
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ]
    }, {
        name: 'L',
        color: '#EF9F00',
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ]
    }, {
        name: 'S',
        color: '#01F001',
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ]
    }, {
        name: 'Z',
        color: '#F00001',
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    }, {
        name: 'T',
        color: '#A000F0',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    }, {
        name: 'O',
        color: '#F1F000',
        shape: [
            [1, 1],
            [1, 1]
        ]
    }/*, { // This version of the o piece allows for o-spins
        name: 'O',
        color: '#F1F000',
        shape: [
            [0, 1, 1],
            [0, 1, 1],
            [0, 0, 0]
        ]
    }*//*, {
        name: 'wtf',
        color: '#F0007F',
        shape: [
            [0, 1, 1, 1, 0],
            [1, 1, 0, 1, 0],
            [0, 1, 1, 0, 0],
            [1, 1, 0, 0, 0],
            [1, 0, 0, 0, 0]
        ]
    }*/],
    dims: {
        width: 10,
        height: 20
    },
    control: {
        hdrop: {
            key: 'w',
            pressed: 0,
            buffer: 0
        },
        down: {
            key: 's',
            pressed: 0
        },
        left: {
            key: 'a',
            pressed: 0
        },
        right: {
            key: 'd',
            pressed: 0
        },
        ccw: {
            key: 'j',
            pressed: 0,
            buffer: 0
        },
        cw: {
            key: 'k',
            pressed: 0,
            buffer: 0
        },
        pause: {
            key: 'Enter',
            pressed: 0,
            buffer: 0
        }
    }
};

let boardSize = 500;
let wrapper = document.getElementById('wrapper');
let divBoard = document.getElementById('board');
let pauseDiv = document.getElementById('pause');
let wrapperWidth = boardSize * game.dims.width / game.dims.height;
let wrapperHeight = boardSize;

wrapper.style.width = `${wrapperWidth}px`;
wrapper.style.height = `${wrapperHeight}px`;

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

let board = ((out = []) => {
    for (let i = 0; i < game.dims.height; i++) {
        out.push(new Array(game.dims.width).fill(undefined));
    }
    
    return out;
})();
let piece;

function print(arr) {
    let out = ''
    for (let i = 0; i < arr.length; i++) out += arr[i].toString().replaceAll(',', '\t') + '\n';
    console.log(out);
}

// Literally just stolen from stackoverflow lol
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

function drawPixel(col, row, color) {
    // Find the pixel and give it proper attributes
    let pixel = divBoard.children[col].children[row];
    pixel.className = 'game-col';
    pixel.style.width = `${100 / game.dims.width}%`;

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

function erasePiece() {
    for (let indices of piece.indices) {
        drawPixel(indices[0], indices[1], '#333333');
    }
}

function drawPiece() {
    for (let indices of piece.indices) {
        drawPixel(indices[0], indices[1], piece.color);
    }
}

function setPiece(minoIndex) {
    let mino = game.minoes[minoIndex];
    let leftmost = Math.floor((game.dims.width - mino.shape.length) / 2);

    piece = {
        color: mino.color,
        indices: ((out = []) => {
            for (let i = 0; i < mino.shape.length; i++) {
                for (let j = 0; j < mino.shape.length; j++) {
                    if (mino.shape[i][j]) {
                        out.push([i, j + leftmost]);
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
    erasePiece();

    // If I just redefined the piece indices, the code breaks; I do not know why. 
    let newIndices = [];

    for (let i = 0; i < piece.indices.length; i++) {
        // Move the x and y positions of the indices to (0, 0) instead of their current center
        let y = piece.indices[i][0] - piece.center[0];
        let x = piece.indices[i][1] - piece.center[1];
        
        // Calculate how far away they are from the center and what angle they're at from the center
        let scale = Math.sqrt(y * y + x * x);
        let angle = Math.atan2(x, y);

        // Rotate the x and the y pieces clockwise or widdershins
        let indexArray = [
            Math.round(scale * Math.cos(angle - dir * Math.PI / 2) + piece.center[0]), 
            Math.round(scale * Math.sin(angle - dir * Math.PI / 2) + piece.center[1])
        ];

        if (
            // The attempted rotation location exists...
            board[indexArray[0]][indexArray[1]] ||
            // or if that location is out of bounds...
            indexArray[0] < 0 || indexArray[0] > game.dims.height -1 ||
            indexArray[1] < 0 || indexArray[1] > game.dims.width -1 ||
            // or if it didn't pass TTC SRS checks...
            check > 4
        ) {
            // Do not rotate
            // Implement TTC SRS by adjusting the centerpoint, allowing for four extra checks
            drawPiece();
            return;
        }

        newIndices.push(indexArray);
    }

    piece.indices = newIndices;
    drawPiece();
}

function movePiece(x, y) {
    erasePiece();

    let newIndices = [];

    for (let i = 0; i < piece.indices.length; i++) {
        let newY = piece.indices[i][0] + y;
        let newX = piece.indices[i][1] + x;

        // to-do: make it so that only downward collisions create a new piece

        if (!board[newY] || board[newY][newX]) {
            if (y != 0) {
                if (game.placeBuffer) {
                    for (let i = 0; i < piece.indices.length; i++) {
                        board[piece.indices[i][0]][piece.indices[i][1]] = piece.color;
                        if (!board[piece.indices[i][0]].includes(undefined)) {
                            if (!game.linesCleared.includes(piece.indices[i][0])) {
                                game.linesCleared.push(piece.indices[i][0]);
                            }
                        }
                    }
                    drawPiece();
                    piece = undefined;
                    game.placeBuffer--;
                } else {
                    game.placeBuffer = 1;
                }
            }
            if (piece) drawPiece();
            return;
        } else if (newX < 0 || newX > game.dims.width - 1) {
            drawPiece();
            return;
        }
        newIndices.push([newY, newX]);
    }

    if (game.placeBuffer) game.placeBuffer--;

    piece.indices = newIndices;
    piece.center[0] += y;
    piece.center[1] += x;

    drawPiece();
}

document.addEventListener("keydown", (e) => {
    for (let key in game.control) {
        if (game.control[key].key == e.key) {
            if (!game.control[key].buffer) game.control[key].pressed = 1;
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

let gameLoop = setInterval(() => {
    if (game.paused) {
        // to do: rewrite as an event listener instead of something that's executed every frame
        if (game.control.pause.pressed) {
            game.control.pause.pressed = 0;
            
            if (game.control.pause.buffer != undefined) {
                game.control.pause.buffer = 1;
            }

            game.paused = false;
            pauseDiv.innerHTML = '';
        }
    } else {
        if (game.linesCleared.length == 0) {
            // If there is no piece, add one
            if (!piece) setPiece(Math.floor(Math.random() * game.minoes.length));

            // Increment the timer
            game.timer = (game.timer + 1) % 60;

            // Move the piece down from time to time
            if (game.timer % Math.round(60 / game.speed) == 0) {
                movePiece(0, 1);
            }
            
            // If the game is completed, stop the loop
            if (game.done) clearInterval(gameLoop);

            // Control manager
            // to do: make it so that this doesn't run if there isn't a piece (or, alternatively, move the piece down last)
            for (let control in game.control) {
                if (game.control[control].pressed) {
                    game.control[control].pressed = 0;
                    
                    if (game.control[control].buffer != undefined) {
                        game.control[control].buffer = 1;
                    }

                    switch (control) {
                        case 'left':
                            movePiece(-1, 0);
                            break;
                        case 'right':
                            movePiece(1, 0);
                            break;
                        case 'down':
                            movePiece(0, 1);
                            break;
                        case 'hdrop':
                            while (piece) movePiece(0, 1);
                            break;
                        case 'cw':
                            rotatePiece(1);
                            break;
                        case 'ccw':
                            rotatePiece(-1);
                            break;
                        case 'pause':
                            pauseDiv.innerHTML = 'Paused!';
                            game.paused = true;
                            break;
                    }
                }
            }
        } else {
            // Sort line indices from smallest to largest; Ensures that no bugs happen when the above lines are dropped down
            game.linesCleared.sort((a, b) => (a - b));

            for (let i = 0; i < game.linesCleared.length; i++) {
                // Clear line; No need to redraw since it's going to get overwritten anyway
                board[game.linesCleared[i]].fill(undefined);

                // Move everything from above that line down
                for (let j = game.linesCleared[i] - 1; j > -1; j--) {
                    for (let k = 0; k < board[j].length; k++) {
                        board[j + 1][k] = board[j][k];
                        drawPixel(j + 1, k, board[j + 1][k] || '#333333');
                        drawPixel(j, k, '#333333');
                    }
                    board[j].fill(undefined);
                }
            }

            game.linesCleared = [];
        }
    }
}, 1000 / 60);
