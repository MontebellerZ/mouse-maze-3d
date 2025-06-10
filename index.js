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
const moveSpeed = 20;

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
    // camera.position.set(centerCoord, wallHeight / 2, centerCoord);
    camera.position.set(centerCoord, wallHeight * 20, centerCoord);
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
    // Gera larguras aleatórias para corredores horizontais e verticais
    const rows = maze.length;
    const cols = maze[0].length;
    const corridorWidthsX = Array.from({ length: cols + 1 }, () => Math.random() * 3 + 1); // 1 a 4 metros
    const corridorWidthsZ = Array.from({ length: rows + 1 }, () => Math.random() * 3 + 1);

    // Calcula as posições acumuladas para cada célula
    const posX = [0];
    for (let i = 0; i < cols; i++) {
        posX.push(posX[i] + corridorWidthsX[i]);
    }
    const posZ = [0];
    for (let i = 0; i < rows; i++) {
        posZ.push(posZ[i] + corridorWidthsZ[i]);
    }

    maze.reverse().forEach((row, z) => {
        row.forEach((cell, x) => {
            const x0 = posX[x];
            const x1 = posX[x + 1];
            const z0 = posZ[z];
            const z1 = posZ[z + 1];

            // Parede superior
            if (cell.top) setWall(x1 - x0, wallThin, (x0 + x1) / 2, z1 - wallThin / 2);

            // Parede inferior
            if (cell.bottom) setWall(x1 - x0, wallThin, (x0 + x1) / 2, z0 + wallThin / 2);

            // Parede esquerda
            if (cell.left) setWall(wallThin, z1 - z0, x0 + wallThin / 2, (z0 + z1) / 2);

            // Parede direita
            if (cell.right) setWall(wallThin, z1 - z0, x1 - wallThin / 2, (z0 + z1) / 2);
        });
    });

    window.posX = posX;
    window.posZ = posZ;
    window.maze = maze;
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

function setFloors() {
    // O chão cobre toda a área do labirinto, mais 4 metros de borda em cada lado
    if (!window.posX || !window.posZ) return;
    const minX = posX[0] - 4;
    const maxX = posX[posX.length - 1] + 4;
    const minZ = posZ[0] - 4;
    const maxZ = posZ[posZ.length - 1] + 4;
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const repeatTextureX = width / 3;
    const repeatTextureZ = depth / 3;
    FLOOR_TEXTURE.repeat.set(repeatTextureX, repeatTextureZ);
    const geometry = new THREE.PlaneGeometry(width, depth, 10, 10);
    const plane = new THREE.Mesh(geometry, FLOOR_MATERIAL);
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(centerX, 0, centerZ);
    scene.add(plane);

    // Desenha margens vermelhas 360 graus ao redor de cada parede, com bordas arredondadas nas pontas
    const margin = 1;
    const marginMaterial = new THREE.MeshBasicMaterial({ color: 0x662222, transparent: true, opacity: 1, side: THREE.DoubleSide });
    for (let z = 0; z < posZ.length - 1; z++) {
        for (let x = 0; x < posX.length - 1; x++) {
            const x0 = posX[x];
            const x1 = posX[x + 1];
            const z0 = posZ[z];
            const z1 = posZ[z + 1];
            // Parede superior
            if ((window.maze && window.maze[z] && window.maze[z][x] && window.maze[z][x].top) || z === posZ.length - 2) {
                const cx = (x0 + x1) / 2;
                const cz = z1 - wallThin / 2;
                const w = x1 - x0;
                // Retângulo central
                const marginGeo = new THREE.PlaneGeometry(w, wallThin + 2 * margin);
                const mesh = new THREE.Mesh(marginGeo, marginMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(cx, 0.03, cz);
                scene.add(mesh);
                // Círculo completo nas pontas
                const radius = (wallThin + 2 * margin) / 2;
                let circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.position.set(x0, 0.031, cz);
                scene.add(circleMesh);
                circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.position.set(x1, 0.031, cz);
                scene.add(circleMesh);
            }
            // Parede inferior
            if ((window.maze && window.maze[z] && window.maze[z][x] && window.maze[z][x].bottom) || z === 0) {
                const cx = (x0 + x1) / 2;
                const cz = z0 + wallThin / 2;
                const w = x1 - x0;
                const marginGeo = new THREE.PlaneGeometry(w, wallThin + 2 * margin);
                const mesh = new THREE.Mesh(marginGeo, marginMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(cx, 0.03, cz);
                scene.add(mesh);
                // Círculo completo nas pontas
                const radius = (wallThin + 2 * margin) / 2;
                let circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.position.set(x0, 0.031, cz);
                scene.add(circleMesh);
                circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.position.set(x1, 0.031, cz);
                scene.add(circleMesh);
            }
            // Parede esquerda
            if ((window.maze && window.maze[z] && window.maze[z][x] && window.maze[z][x].left) || x === 0) {
                const cx = x0 + wallThin / 2;
                const cz = (z0 + z1) / 2;
                const d = z1 - z0;
                const marginGeo = new THREE.PlaneGeometry(wallThin + 2 * margin, d);
                const mesh = new THREE.Mesh(marginGeo, marginMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(cx, 0.03, cz);
                scene.add(mesh);
                // Círculo completo nas pontas
                const radius = (wallThin + 2 * margin) / 2;
                let circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.rotation.z = Math.PI / 2;
                circleMesh.position.set(cx, 0.031, z0);
                scene.add(circleMesh);
                circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.rotation.z = -Math.PI / 2;
                circleMesh.position.set(cx, 0.031, z1);
                scene.add(circleMesh);
            }
            // Parede direita
            if ((window.maze && window.maze[z] && window.maze[z][x] && window.maze[z][x].right) || x === posX.length - 2) {
                const cx = x1 - wallThin / 2;
                const cz = (z0 + z1) / 2;
                const d = z1 - z0;
                const marginGeo = new THREE.PlaneGeometry(wallThin + 2 * margin, d);
                const mesh = new THREE.Mesh(marginGeo, marginMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(cx, 0.03, cz);
                scene.add(mesh);
                // Círculo completo nas pontas
                const radius = (wallThin + 2 * margin) / 2;
                let circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.rotation.z = Math.PI / 2;
                circleMesh.position.set(cx, 0.031, z0);
                scene.add(circleMesh);
                circleMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), marginMaterial);
                circleMesh.rotation.x = -Math.PI / 2;
                circleMesh.rotation.z = -Math.PI / 2;
                circleMesh.position.set(cx, 0.031, z1);
                scene.add(circleMesh);
            }
        }
    }
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
    setMaze(maze);
    setFloors();
    setLights();

    animate();

    document.addEventListener("click", () => {
        if (controls) controls.lock();
        else console.warn("null/undefined controls");
    });
}

window.onload = init;
