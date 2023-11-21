import * as THREE from "./js/three.module.js";
import { generateMaze } from "./maze.js";

var scene;
var camera;
var renderer;

const wallThin = 0.1;
const wallThick = 1 + wallThin;
const wallHeight = 1;

const WALL_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x808080 }); // Gray color for walls

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function createWall(width, depth, x, z, material = null) {
    const wallGeometry = new THREE.BoxGeometry(width, wallHeight, depth); // Adjust dimensions as needed
    const wallMesh = new THREE.Mesh(wallGeometry, material || WALL_MATERIAL);
    wallMesh.position.set(x, wallHeight / 2, z); // Position walls according to maze coordinates
    return wallMesh;
}

function renderMaze(maze) {
    // Loop through maze cells to create walls
    maze.reverse().forEach((row, z) => {
        row.forEach((cell, x) => {
            // Check each wall of the cell and create a wall if it exists
            if (cell.top) {
                const topWall = createWall(
                    wallThick,
                    wallThin,
                    x,
                    z + wallThick / 2 - wallThin / 2
                );
                scene.add(topWall);
            }
            if (cell.bottom) {
                const bottomWall = createWall(
                    wallThick,
                    wallThin,
                    x,
                    z - wallThick / 2 + wallThin / 2
                );
                scene.add(bottomWall);
            }
            if (cell.left) {
                const leftWall = createWall(
                    wallThin,
                    wallThick,
                    x - wallThick / 2 + wallThin / 2,
                    z
                );
                scene.add(leftWall);
            }
            if (cell.right) {
                const rightWall = createWall(
                    wallThin,
                    wallThick,
                    x + wallThick / 2 - wallThin / 2,
                    z
                );
                scene.add(rightWall);
            }
        });
    });
}

function setLights() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 10);
    sunLight.position.set(0, 1, 0);
    sunLight.castShadow = true;

    sunLight.target.position.copy(new THREE.Vector3(0, 0, 0));
    scene.add(sunLight);
    scene.add(sunLight.target);

    const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.shadowMapEnabled = true
    document.body.appendChild(renderer.domElement);

    const dificulty = 10;
    const centerCoord = (dificulty - 1) / 2;

    // Position the camera above the maze, looking down
    camera.position.set(0, 3, 0); // Adjust the z-coordinate to change the distance from the maze
    camera.lookAt(centerCoord, 0, centerCoord); // Look at the center of the maze

    const maze = generateMaze(dificulty, dificulty);

    renderMaze(maze);
    setLights();

    render();
}

window.onload = init;
