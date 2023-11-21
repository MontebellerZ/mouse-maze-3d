import * as THREE from "./js/three.module.js";
import { OrbitControls } from "./js/OrbitControls.js";
import { generateMaze } from "./maze.js";

/** @type {THREE.Scene} */
var scene;
/** @type {THREE.PerspectiveCamera} */
var camera;
/** @type {THREE.WebGLRenderer} */
var renderer;

const wallThin = 0.1;
const wallThick = 1 + wallThin;
const wallHeight = 1;

const WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xfafafa }); // Gray color for walls
const FLOOR_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xc9a771, side: THREE.DoubleSide }); // Yellowwish color for floors

function render() {
    requestAnimationFrame(() => {
        renderer.render(scene, camera);
        render();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setScene(centerCoord) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize, false);

    const fov = 90;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000.0;

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(centerCoord, 8, centerCoord);
    camera.lookAt(centerCoord, 0, centerCoord);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(centerCoord, 0, centerCoord);
    controls.update();
}

function setWall(width, depth, x, z, material = null) {
    const geometry = new THREE.BoxGeometry(width, wallHeight, depth); // Adjust dimensions as needed
    const wall = new THREE.Mesh(geometry, material || WALL_MATERIAL);
    wall.position.set(x, wallHeight / 2, z); // Position walls according to maze coordinates
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
}

function setMaze(maze) {
    // Loop through maze cells to create walls
    maze.reverse().forEach((row, z) => {
        row.forEach((cell, x) => {
            // Check each wall of the cell and create a wall if it exists
            if (cell.top) setWall(wallThick, wallThin, x, z + wallThick / 2 - wallThin / 2);

            if (cell.bottom) setWall(wallThick, wallThin, x, z - wallThick / 2 + wallThin / 2);

            if (cell.left) setWall(wallThin, wallThick, x - wallThick / 2 + wallThin / 2, z);

            if (cell.right) setWall(wallThin, wallThick, x + wallThick / 2 - wallThin / 2, z);
        });
    });
}

function setLights() {
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.01;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 1.0;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = 200;
    light.shadow.camera.right = -200;
    light.shadow.camera.top = 200;
    light.shadow.camera.bottom = -200;
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
}

function setFloors(dificulty, center, material) {
    const width = dificulty + 3;
    const geometry = new THREE.PlaneGeometry(width, width, 1, 1);
    const plane = new THREE.Mesh(geometry, material || FLOOR_MATERIAL);
    plane.castShadow = true;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(center, 0, center);
    scene.add(plane);
}

function setBackground() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        "./resources/skybox/posx.jpg",
        "./resources/skybox/negx.jpg",
        "./resources/skybox/posy.jpg",
        "./resources/skybox/negy.jpg",
        "./resources/skybox/posz.jpg",
        "./resources/skybox/negz.jpg",
    ]);
    scene.background = texture;
}

function init() {
    const dificulty = 10;
    const centerCoord = (dificulty - 1) / 2;
    const maze = generateMaze(dificulty, dificulty);

    setScene(centerCoord);

    setBackground();
    setFloors(dificulty, centerCoord);
    setMaze(maze);
    setLights();

    render();
}

window.onload = init;
