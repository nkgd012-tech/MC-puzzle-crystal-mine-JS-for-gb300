'use strict';

// MINECRAFT PUZZLE - CRYSTAL MINE
// GB300 / mQuickJS - 320x240

var SW = 320, SH = 240;

var BTN_B = 1, BTN_Y = 2, BTN_SELECT = 4, BTN_START = 8;
var BTN_UP = 16, BTN_DOWN = 32, BTN_LEFT = 64, BTN_RIGHT = 128;
var BTN_A = 256, BTN_X = 512, BTN_L = 1024, BTN_R = 2048;

var TILE = 24;
var GRID_W = 10, GRID_H = 8;
var GRID_X = 40, GRID_Y = 34;

var C = {
    black: 0xFF101820,
    panel: 0xFF1B2A35,
    white: 0xFFFFFFFF,
    gray: 0xFF687782,
    wall: 0xFF56616A,
    wallTop: 0xFF89939B,
    floor: 0xFF263B42,
    floorAlt: 0xFF2D464D,
    green: 0xFF56C568,
    greenDark: 0xFF287A45,
    brown: 0xFF9B6239,
    brownDark: 0xFF634027,
    gold: 0xFFFFD34E,
    blue: 0xFF48C9E8,
    red: 0xFFEF5A5A,
    purple: 0xFFB28BFF,
    dark: 0xFF0A1117
};

var levels = [
    [
        "##########",
        "#........#",
        "#..P.CG..#",
        "#..##....#",
        "#..K...D.#",
        "#........#",
        "#........#",
        "##########"
    ],
    [
        "##########",
        "#........#",
        "#.P.C....#",
        "#..##.G..#",
        "#..C.....#",
        "#..K...D.#",
        "#........#",
        "##########"
    ],
    [
        "##########",
        "#........#",
        "#..P.....#",
        "#.C#..G..#",
        "#..C.....#",
        "#..K..#D.#",
        "#........#",
        "##########"
    ]
];

var levelIndex = 0;
var world = [];
var crates = [];
var goals = [];
var keys = [];
var doors = [];

var player = { x: 2, y: 2 };

var hasKey = false;
var screen = "title";
var paused = false;
var won = false;

var moveCooldown = 0;
var lastTime = Date.now();

var prevStart = false;
var prevA = false;
var prevB = false;
var prevSelect = false;

var moveCount = 0;
var message = "";
var messageTimer = 0;

function say(s) {
    message = s;
    messageTimer = 1.7;
}

function loadLevel(n) {
    levelIndex = n;

    world = [];
    crates = [];
    goals = [];
    keys = [];
    doors = [];

    hasKey = false;
    won = false;
    paused = false;
    moveCount = 0;
    moveCooldown = 0;

    var data = levels[levelIndex];

    for (var y = 0; y < GRID_H; y++) {
        world[y] = [];

        for (var x = 0; x < GRID_W; x++) {
            var ch = data[y].charAt(x);

            world[y][x] = ch === "#" ? 1 : 0;

            if (ch === "P") {
                player.x = x;
                player.y = y;
            }

            if (ch === "C") {
                crates.push({ x: x, y: y });
            }

            if (ch === "G") {
                goals.push({ x: x, y: y });
            }

            if (ch === "K") {
                keys.push({
                    x: x,
                    y: y,
                    taken: false
                });
            }

            if (ch === "D") {
                doors.push({ x: x, y: y });
            }
        }
    }

    say("Find key and move crate to goal!");
}

function samePos(a, x, y) {
    return a.x === x && a.y === y;
}

function crateAt(x, y) {
    for (var i = 0; i < crates.length; i++) {
        if (samePos(crates[i], x, y)) {
            return i;
        }
    }

    return -1;
}

function goalAt(x, y) {
    for (var i = 0; i < goals.length; i++) {
        if (samePos(goals[i], x, y)) {
            return true;
        }
    }

    return false;
}

function keyAt(x, y) {
    for (var i = 0; i < keys.length; i++) {
        if (!keys[i].taken && samePos(keys[i], x, y)) {
            return i;
        }
    }

    return -1;
}

function doorAt(x, y) {
    for (var i = 0; i < doors.length; i++) {
        if (samePos(doors[i], x, y)) {
            return true;
        }
    }

    return false;
}

function allGoalsFilled() {
    for (var i = 0; i < goals.length; i++) {
        if (crateAt(goals[i].x, goals[i].y) < 0) {
            return false;
        }
    }

    return true;
}

function canWalk(x, y) {
    if (x < 0 || x >= GRID_W ||
        y < 0 || y >= GRID_H) {
        return false;
    }

    if (world[y][x] === 1) {
        return false;
    }

    if (doorAt(x, y) && !hasKey) {
        return false;
    }

    return true;
}

function tryMove(dx, dy) {
    if (screen !== "game" || paused || won) {
        return;
    }

    var nx = player.x + dx;
    var ny = player.y + dy;

    if (!canWalk(nx, ny)) {
        if (doorAt(nx, ny) && !hasKey) {
            say("Find the golden key first!");
        }

        return;
    }

    var ci = crateAt(nx, ny);

    if (ci >= 0) {
        var bx = nx + dx;
        var by = ny + dy;

        if (!canWalk(bx, by) ||
            crateAt(bx, by) >= 0 ||
            doorAt(bx, by)) {
            say("Cannot push the crate there!");
            return;
        }

        crates[ci].x = bx;
        crates[ci].y = by;
    }

    player.x = nx;
    player.y = ny;
    moveCount++;

    var ki = keyAt(player.x, player.y);

    if (ki >= 0) {
        keys[ki].taken = true;
        hasKey = true;
        say("Key collected! Door unlocked!");
    }

    if (allGoalsFilled() && hasKey) {
        won = true;
        say("Puzzle solved! Press A.");
    } else if (allGoalsFilled()) {
        say("Goal complete! Find the key.");
    }
}

function restartLevel() {
    loadLevel(levelIndex);
    screen = "game";
    say("Level restarted.");
}

function update(dt) {
    var input = 0;

    try {
        if (typeof getInputState !== "undefined") {
            input = getInputState() | 0;
        }
    } catch (e) {
        input = 0;
    }

    var isStart = (input & BTN_START) !== 0;
    var isA = (input & BTN_A) !== 0;
    var isB = (input & BTN_B) !== 0;
    var isSelect = (input & BTN_SELECT) !== 0;

    if (isSelect && !prevSelect) {
        screen = "title";
        paused = false;
    }

    if (screen === "title") {
        if (isA && !prevA) {
            loadLevel(0);
            screen = "game";
        }
    } else if (screen === "game") {
        if (isStart && !prevStart) {
            paused = !paused;
        }

        if (isB && !prevB) {
            restartLevel();
        }

        if (!paused && !won) {
            moveCooldown -= dt;

            if (moveCooldown <= 0) {
                var moved = false;

                if (input & BTN_UP) {
                    tryMove(0, -1);
                    moved = true;
                } else if (input & BTN_DOWN) {
                    tryMove(0, 1);
                    moved = true;
                } else if (input & BTN_LEFT) {
                    tryMove(-1, 0);
                    moved = true;
                } else if (input & BTN_RIGHT) {
                    tryMove(1, 0);
                    moved = true;
                }

                if (moved) {
                    moveCooldown = 0.14;
                }
            }
        }

        if (won && isA && !prevA) {
            if (levelIndex < levels.length - 1) {
                loadLevel(levelIndex + 1);
            } else {
                screen = "complete";
            }
        }
    } else if (screen === "complete") {
        if (isA && !prevA) {
            screen = "title";
        }
    }

    if (messageTimer > 0) {
        messageTimer -= dt;
    }

    prevStart = isStart;
    prevA = isA;
    prevB = isB;
    prevSelect = isSelect;
}

function rect(x, y, w, h, color) {
    ScreenDraw.fillRect(
        x | 0,
        y | 0,
        w | 0,
        h | 0,
        color
    );
}

function txt(x, y, s, color) {
    ScreenDraw.text8x8(
        x | 0,
        y | 0,
        String(s),
        color
    );
}

function drawBlock(x, y, color, edge) {
    var px = GRID_X + x * TILE;
    var py = GRID_Y + y * TILE;

    rect(px + 1, py + 1, TILE - 2, TILE - 2, color);
    rect(px + 1, py + 1, TILE - 2, 3, edge);
    rect(px + 1, py + TILE - 4, TILE - 2, 3, C.dark);
}

function renderTitle() {
    rect(0, 0, SW, SH, C.dark);
    rect(0, 0, SW, 9, C.green);

    txt(44, 30, "MINECRAFT PUZZLE", C.white);
    txt(74, 44, "CRYSTAL MINE", C.blue);

    drawBlock(3, 2, C.wall, C.wallTop);
    drawBlock(4, 2, C.wall, C.wallTop);
    drawBlock(5, 2, C.wall, C.wallTop);

    drawBlock(3, 3, C.floor, C.gray);
    drawBlock(4, 3, C.brown, C.gold);
    drawBlock(5, 3, C.floor, C.gray);

    rect(112, 91, 12, 14, C.blue);
    rect(116, 84, 5, 8, C.purple);
    rect(108, 97, 4, 7, C.blue);

    txt(72, 139, "Push crates onto green goals.", C.white);
    txt(55, 153, "Collect key to unlock the door.", C.white);

    txt(84, 180, "D-PAD  MOVE", C.gold);
    txt(84, 194, "B  RESTART LEVEL", C.gold);
    txt(72, 216, "PRESS A TO START", C.green);
}

function renderGame() {
    rect(0, 0, SW, SH, C.black);
    rect(0, 0, SW, 25, C.panel);

    txt(6, 8, "CRYSTAL MINE", C.white);
    txt(210, 8, "LV " + (levelIndex + 1) + "/3", C.gold);

    for (var y = 0; y < GRID_H; y++) {
        for (var x = 0; x < GRID_W; x++) {
            var px = GRID_X + x * TILE;
            var py = GRID_Y + y * TILE;

            if (world[y][x] === 1) {
                drawBlock(x, y, C.wall, C.wallTop);
            } else {
                var fc = ((x + y) % 2 === 0)
                    ? C.floor
                    : C.floorAlt;

                rect(px, py, TILE, TILE, fc);
                rect(px, py + TILE - 2, TILE, 2, C.dark);
            }

            if (goalAt(x, y)) {
                rect(px + 5, py + 5, 14, 14, C.greenDark);
                rect(px + 8, py + 8, 8, 8, C.green);
            }

            if (doorAt(x, y)) {
                if (hasKey) {
                    rect(px + 5, py + 3, 14, 19, C.greenDark);
                    rect(px + 8, py + 6, 8, 13, C.green);
                } else {
                    rect(px + 5, py + 3, 14, 19, C.brownDark);
                    rect(px + 8, py + 6, 8, 13, C.brown);
                    rect(px + 14, py + 11, 3, 3, C.gold);
                }
            }
        }
    }

    for (var k = 0; k < keys.length; k++) {
        if (!keys[k].taken) {
            var kx = GRID_X + keys[k].x * TILE;
            var ky = GRID_Y + keys[k].y * TILE;

            rect(kx + 6, ky + 6, 12, 5, C.gold);
            rect(kx + 11, ky + 8, 5, 10, C.gold);
            rect(kx + 13, ky + 14, 5, 3, C.gold);
        }
    }

    for (var i = 0; i < crates.length; i++) {
        var bx = GRID_X + crates[i].x * TILE;
        var by = GRID_Y + crates[i].y * TILE;
        var onGoal = goalAt(crates[i].x, crates[i].y);

        rect(
            bx + 3, by + 3,
            TILE - 6, TILE - 6,
            onGoal ? C.green : C.brown
        );

        rect(
            bx + 5, by + 5,
            TILE - 10, TILE - 10,
            onGoal ? C.greenDark : C.gold
        );

        rect(
            bx + 8, by + 8,
            TILE - 16, TILE - 16,
            onGoal ? C.green : C.brown
        );
    }

    // Player
    var ax = GRID_X + player.x * TILE;
    var ay = GRID_Y + player.y * TILE;

    rect(ax + 5, ay + 4, 14, 17, C.blue);
    rect(ax + 6, ay + 2, 12, 8, C.gold);
    rect(ax + 8, ay + 5, 2, 2, C.dark);
    rect(ax + 14, ay + 5, 2, 2, C.dark);
    rect(ax + 7, ay + 14, 4, 6, C.white);
    rect(ax + 13, ay + 14, 4, 6, C.white);

    rect(0, 228, SW, 12, C.panel);

    txt(5, 230, "KEY:" + (hasKey ? "YES" : "NO"),
        hasKey ? C.gold : C.gray);

    txt(85, 230, "MOVES:" + moveCount, C.white);
    txt(198, 230, "B:RESET START:PAUSE", C.white);

    if (messageTimer > 0 && message) {
        rect(18, 27, 284, 12, C.dark);
        txt(22, 29, message, C.white);
    }

    if (paused) {
        rect(54, 91, 212, 58, C.dark);
        rect(54, 91, 212, 2, C.blue);

        txt(125, 105, "PAUSED", C.gold);
        txt(77, 122, "START TO RESUME", C.white);
        txt(84, 135, "SELECT: TITLE", C.gray);
    }

    if (won) {
        rect(42, 83, 236, 70, C.dark);
        rect(42, 83, 236, 3, C.green);

        txt(91, 96, "PUZZLE SOLVED!", C.green);
        txt(73, 113, "KEY + GOAL COMPLETE", C.white);

        txt(
            67, 132,
            levelIndex < levels.length - 1
                ? "PRESS A: NEXT LEVEL"
                : "PRESS A: FINISH",
            C.gold
        );
    }
}

function renderComplete() {
    rect(0, 0, SW, SH, C.dark);
    rect(0, 0, SW, 8, C.green);

    txt(80, 56, "MINE COMPLETED!", C.gold);
    txt(60, 88, "You escaped the crystal mine.", C.white);
    txt(77, 115, "ALL 3 PUZZLES SOLVED", C.green);
    txt(67, 158, "PRESS A FOR TITLE", C.blue);
    txt(65, 200, "THANKS FOR PLAYING!", C.white);
}

function render() {
    if (typeof ScreenDraw === "undefined" || !ScreenDraw) {
        return;
    }

    if (screen === "title") {
        renderTitle();
    } else if (screen === "game") {
        renderGame();
    } else {
        renderComplete();
    }
}

function gameLoop() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000;

    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;

    lastTime = now;

    update(dt);
    render();

    try {
        if (typeof video !== "undefined" && video.present) {
            video.present();
        } else if (
            typeof ScreenDraw !== "undefined" &&
            ScreenDraw.present
        ) {
            ScreenDraw.present();
        }
    } catch (e) {}
}

if (typeof setMainLoop !== "undefined") {
    setMainLoop(gameLoop);
} else if (typeof setInterval !== "undefined") {
    setInterval(gameLoop, 33);
}
