function print(arr) {
    let out = ''
    for (let i = 0; i < arr.length; i++) out += arr[i].toString().replaceAll(',', '\t') + '\n';
    console.log(out);
}

let dims = {
    width: 10,
    height: 20,
    size: 500
};

let divBoard = document.getElementById('board');
let boardWidth = dims.size * dims.width / dims.height;
let boardHeight = dims.size;

divBoard.style.width = `${boardWidth}px`;
divBoard.style.height = `${boardHeight}px`;

for (let i = 0; i < dims.height; i++) {
    let row = document.createElement('div');
    row.className = 'game-row';
    row.id = `row${i}`;
    row.style.height = `${100 / dims.height}%`;

    for (let j = 0; j < dims.width; j++) {
        let col = document.createElement('div');
        col.className = 'game-col';
        col.id = `col${j}`;
        col.style.width = `${100 / dims.width}%`;

        row.append(col);
    }

    divBoard.append(row);
}

let board = ((out = []) => {
    for (let i = 0; i < dims.height; i++) out.push(new Array(dims.width).fill(undefined));
    return out;
})();
let piece;

let minoes = {
    i: {
        name: 'I',
        color: '#00F0F1',
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    }, 
    j: {
        name: 'J',
        color: '#0000f0',
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ]
    }, 
    l: {
        name: 'L',
        color: '#EF9F00',
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ]
    }, 
    s: {
        name: 'S',
        color: '#01F001',
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ]
    }, 
    z: {
        name: 'Z',
        color: '#F00001',
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    }, 
    t: {
        name: 'T',
        color: '#A000F0',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    }, 
    o: {
        name: 'O',
        color: '#F1F000',
        shape: [
            [1, 1],
            [1, 1]
        ]
    }/*,
    wtf: {
        name: 'wtf',
        color: '#F0007F',
        shape: [
            [0, 1, 1, 1, 0],
            [1, 1, 0, 1, 0],
            [0, 1, 1, 0, 0],
            [1, 1, 0, 0, 0],
            [1, 0, 0, 0, 0]
        ]
    }*/
};

let minoArray = Object.values(minoes);

function shapeTemplate(shape) {
    let out = [];
    
    for (let i = 0; i < shape.length; i++) {
        out.push(new Array(shape.length));
    }
    
    return out;
}

function rotatePiece(dir, check = 0) {
    let newIndices = [];

    for (let i = 0; i < piece.indices.length; i++) {
        let y = piece.indices[i][0] - piece.center[0];
        let x = piece.indices[i][1] - piece.center[1];
        
        let scale = Math.sqrt(y * y + x * x);
        let angle = Math.atan2(x, y);

        let indexArray = [
            Math.round(scale * Math.cos(angle - dir * Math.PI / 2) + piece.center[0]), 
            Math.round(scale * Math.sin(angle - dir * Math.PI / 2) + piece.center[1])
        ];

        if (
            // attempted location exists
            board[indexArray[0]][indexArray[1]] ||
            // out of bounds
            indexArray[0] < 0 || indexArray[0] > dims.height -1 ||
            indexArray[1] < 0 || indexArray[1] > dims.width -1 ||
            // piece did not pass SRS tests
            check > 4
        ) {
            // Implement TTC SRS by adjusting the centerpoint, allowing for four extra checks
            return;
        }

        newIndices.push(indexArray);
    }

    piece.indices = newIndices;
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

function colorSquare(col, row, color) {
    let pixel = divBoard.children[col].children[row];
    pixel.className = 'game-col';
    pixel.style.width = `${100 / dims.width}%`;
    pixel.style.height = `100%`;

    if (color != '#333333') {
        if (pixel.children.length == 0) {
            let mino = document.createElement('div');
            mino.className = 'game-mino';
            mino.style.backgroundColor = color;

            pixel.append(mino);
        }

        pixel.style.backgroundColor = shadeColor(color, -40);
    } else {
        pixel.innerHTML = '';
        pixel.style.backgroundColor = color;
    }
}

function drawBoard() {
    for (let i = 0; i < dims.height; i++) {
        for (let j = 0; j < dims.width; j++) {
            if (board[i][j]) {
                colorSquare(i, j, board[i][j]);
            } else {
                colorSquare(i, j, '#333333');
            }
        }
    }
    if (piece) {
        for (let i = 0; i < piece.indices.length; i++) {
            colorSquare(piece.indices[i][0], piece.indices[i][1], piece.color);
        }
    }
}

function movePiece(x, y) {
    let newIndices = [];

    for (let i = 0; i < piece.indices.length; i++) {
        let newY = piece.indices[i][0] + y;
        let newX = piece.indices[i][1] + x;

        // to-do: make it so that only downward collisions create a new piece

        if (!board[newY] || board[newY][newX]) {
            if (y != 0) {
                for (let i = 0; i < piece.indices.length; i++) {
                    board[piece.indices[i][0]][piece.indices[i][1]] = piece.color;
                    if (!board[piece.indices[i][0]].includes(undefined)) {
                        if (!game.linesCleared.includes(piece.indices[i][0])) {
                            game.linesCleared.push(piece.indices[i][0]);
                        }
                    }
                }
                piece = undefined;
            }
            return;
        } else if (newX < 0 || newX > dims.width - 1) {
            return;
        }
        newIndices.push([newY, newX]);
    }

    piece.indices = newIndices;
    piece.center[0] += y;
    piece.center[1] += x;
    drawBoard();
}

function setPiece(mino) {
    let leftmost = Math.floor((dims.width - mino.shape.length) / 2);

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
}

let game = {
    done: undefined,
    level: 0,
    lines: 0,
    timer: 0,
    speed: 2,
    linesCleared: [],
    control: {
        up: {
            pressed: 0
        },
        down: {
            pressed: 0
        },
        left: {
            pressed: 0
        },
        right: {
            pressed: 0
        },
        ccw: {
            pressed: 0,
            buffer: 0
        },
        cw: {
            pressed: 0,
            buffer: 0
        }
    },
    config: { // separated from control to allow for later customization
        up: 'w',
        left: 'a',
        right: 'd',
        down: 's',
        ccw: 'j',
        cw: 'k'
    }
};

document.addEventListener("keydown", (e) => {
    for (let config in game.config) {
        if (game.config[config] == e.key) {
            if (!game.control[config].buffer) game.control[config].pressed = 1;
        }
    }
});
document.addEventListener("keyup", (e) => {
    for (let config in game.config) {
        if (game.config[config] == e.key) {
            game.control[config] = {
                pressed: 0,
                buffer: game.control[config].buffer == undefined ? undefined : 0
            };
        }
    }
});

let gameLoop = setInterval(() => {
    if (game.linesCleared.length == 0) {
        if (!piece) setPiece(minoArray[Math.floor(Math.random() * minoArray.length)]);
        game.timer = (game.timer + 1) % 60;
        if (game.timer % Math.round(60 / game.speed) == 0) {
            movePiece(0, 1);
        }
        if (game.done) clearInterval(gameLoop);

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
                    case 'cw':
                        rotatePiece(1);
                        break;
                    case 'ccw':
                        rotatePiece(-1);
                        break;
                }
            }
        }
        drawBoard();
    } else {
        for (let i = 0; i < game.linesCleared.length; i++) {
            board[game.linesCleared[i]].fill(undefined);
            
            for (let j = game.linesCleared[i] - 1; j > -1; j--) {
                for (let k = 0; k < board[j].length; k++) board[j + 1][k] = board[j][k]; 
                board[j].fill(undefined);
            }
        }
        drawBoard();
        game.linesCleared = [];
    }
}, 1000 / 60);
