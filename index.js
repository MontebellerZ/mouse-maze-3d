import * as THREE from "./js/three.module.js";
import { generateMaze } from "./maze.js";
import { PointerLockControls } from "./js/PointerLockControls.js";

/** @type {THREE.Scene} */
var scene;
/** @type {THREE.PerspectiveCamera} */
var camera;
/** @type {THREE.WebGLRenderer} */
var renderer;
/** @type {PointerLockControls} */
var controls;

const wallThin = 0.1;
const wallThick = 1 + wallThin;
const wallHeight = 1;

const FLOOR_TEXTURE = new THREE.TextureLoader().load("./resources/textures/floor4.jpg");
FLOOR_TEXTURE.wrapS = FLOOR_TEXTURE.wrapT = THREE.MirroredRepeatWrapping;
FLOOR_TEXTURE.anisotropy = 16;
FLOOR_TEXTURE.colorSpace = THREE.SRGBColorSpace;

const WALL_TEXTURE = new THREE.TextureLoader().load("./resources/textures/wall1.jpg");
WALL_TEXTURE.wrapS = WALL_TEXTURE.wrapT = THREE.RepeatWrapping;
WALL_TEXTURE.anisotropy = 16;
WALL_TEXTURE.colorSpace = THREE.SRGBColorSpace;

const WALL_MATERIAL = new THREE.MeshStandardMaterial({
    map: WALL_TEXTURE,
});
const FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
    map: FLOOR_TEXTURE,
});

// player movement variables
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

var prevTime = performance.now();

const velocity = new THREE.Vector3(); // movement of camera/player
const direction = new THREE.Vector3(); // direction of camera/player
const speed = 10;
const moveSpeed = 10;

function animate() {
    requestAnimationFrame(animate);

    movementUpdate();

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setScene() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize, false);
}

function setCamera(centerCoord) {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000.0;

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(centerCoord, wallHeight / 2, centerCoord);
}

function onKeyDown(event) {
    const code = event.code;
    if (code === "KeyA" || code === "ArrowLeft") {
        moveLeft = true;
    }
    if (code === "KeyD" || code === "ArrowRight") {
        moveRight = true;
    }
    if (code === "KeyW" || code === "ArrowUp") {
        moveForward = true;
    }
    if (code === "KeyS" || code === "ArrowDown") {
        moveBackward = true;
    }
}

function onKeyUp(event) {
    const code = event.code;
    if (code === "KeyA" || code === "ArrowLeft") {
        moveLeft = false;
    }
    if (code === "KeyD" || code === "ArrowRight") {
        moveRight = false;
    }
    if (code === "KeyW" || code === "ArrowUp") {
        moveForward = false;
    }
    if (code === "KeyS" || code === "ArrowDown") {
        moveBackward = false;
    }
    if (code === "Space") {
        isJumping = false;
    }
}

function movementUpdate() {
    if (!controls.isLocked) return;

    const time = performance.now(); // current time
    const delta = (time - prevTime) / 1000; // different in time
    // calculate amount of time since last render , in seconds

    velocity.x -= velocity.x * speed * delta;
    velocity.z -= velocity.z * speed * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    prevTime = time;
}

function setControls() {
    controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    renderer.domElement.addEventListener("click", function () {
        controls.lock();
    });
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
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(20, 30, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.0002;
    light.shadow.mapSize.width = 8192;
    light.shadow.mapSize.height = 8192;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
}

function setFloors(dificulty, center, material) {
    const width = dificulty + 4;
    const repeatTexture = width / 3;

    FLOOR_TEXTURE.repeat.set(repeatTexture, repeatTexture);

    const geometry = new THREE.PlaneGeometry(width, width, 10, 10);
    const plane = new THREE.Mesh(geometry, material || FLOOR_MATERIAL);
    plane.castShadow = false;
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

    setScene();
    setCamera(centerCoord);
    setControls();

    setBackground();
    setFloors(dificulty, centerCoord);
    setMaze(maze);
    setLights();

    animate();

    document.addEventListener("click", () => {
        if (controls) controls.lock();
        else console.warn("null/undefined controls");
    });
}

window.onload = init;
