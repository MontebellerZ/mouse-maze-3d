/**
 * Represents a cell in the maze.
 *
 * @typedef {Object} Cell
 * @property {boolean} top - Indicates if the top wall of the cell is present.
 * @property {boolean} bottom - Indicates if the bottom wall of the cell is present.
 * @property {boolean} left - Indicates if the left wall of the cell is present.
 * @property {boolean} right - Indicates if the right wall of the cell is present.
 */

/**
 * Represents a position in the maze.
 *
 * @typedef {Object} Position
 * @property {number} y - The y coordinate of the cell.
 * @property {number} x - The x coordinate of the cell.
 * @property {string} [direction] - Direction to the destination cell on moving.
 * @property {string} [opposite] - Direction to the destination cell on moving.
 * @property {string[]} [keys] - Keyboard keys for its direction.
 */

/**
 * Array of possible movements in the maze.
 *
 * @type {Position[]}
 */
const MOVES = [
    { y: -1, x: 0, opposite: "bottom", direction: "top", keys: ["ArrowUp", "W", "w"] },
    { y: 0, x: -1, opposite: "right", direction: "left", keys: ["ArrowLeft", "A", "a"] },
    { y: 1, x: 0, opposite: "top", direction: "bottom", keys: ["ArrowDown", "S", "s"] },
    { y: 0, x: 1, opposite: "left", direction: "right", keys: ["ArrowRight", "D", "d"] },
];

/**
 * Generate a maze with the specified width and height.
 *
 * @param {number} width - The width of the maze.
 * @param {number} height - The height of the maze.
 * @returns {Cell[][]} A two-dimensional array representing the maze, where each cell is of type 'Cell'.
 */
export function generateMaze(width, height) {
    /** @type {Cell[][]} */
    const maze = [];

    for (let y = 0; y < height; y++) {
        maze.push([]);

        for (let x = 0; x < width; x++) {
            maze[y][x] = {
                walls: {
                    top: true,
                    bottom: true,
                    left: true,
                    right: true,
                },
                visited: false,
            };
        }
    }

    let currentCell = {
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height),
    };

    let visited = 1;
    maze[currentCell.y][currentCell.x].visited = true;

    const totalCells = width * height;

    const path = [currentCell];

    while (visited < totalCells) {
        const possibleMoves = MOVES.filter((move) => {
            return (
                currentCell.y + move.y >= 0 &&
                currentCell.y + move.y < height &&
                currentCell.x + move.x >= 0 &&
                currentCell.x + move.x < width &&
                !maze[currentCell.y + move.y][currentCell.x + move.x].visited
            );
        });

        if (!(possibleMoves.length > 0)) {
            currentCell = path.pop();
            continue;
        }

        const nextMoveIndex = Math.floor(Math.random() * possibleMoves.length);
        const nextMove = possibleMoves[nextMoveIndex];

        const nextCell = {
            x: currentCell.x + nextMove.x,
            y: currentCell.y + nextMove.y,
        };

        maze[currentCell.y][currentCell.x].walls[nextMove.direction] = false;
        maze[nextCell.y][nextCell.x].walls[nextMove.opposite] = false;
        maze[nextCell.y][nextCell.x].visited = true;

        path.push(nextCell);
        currentCell = nextCell;

        visited++;
    }

    const mazeMap = maze.map((lines) => lines.map(({ walls }) => walls));

    return mazeMap;
}
