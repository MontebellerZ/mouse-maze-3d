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
var moveUp = false; // only in creative mode
var moveDown = false; // only in creative mode
var moveSlow = false;
var moveFast = false;

var prevTime = performance.now();

const velocity = new THREE.Vector3(); // movement of camera/player
const direction = new THREE.Vector3(); // direction of camera/player
const speed = 10;
let moveSpeed = 20;

// Adiciona variáveis para posição inicial do jogador
let initialPlayerPosition = null;

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
    const height = wallHeight * 0.8;

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // Posição inicial: fora da entrada do labirinto, olhando para dentro
    // A entrada está no canto inferior esquerdo (x=0, z=0), mas as posições reais estão em posX[0], posZ[0]
    // Vamos posicionar o jogador um pouco antes da entrada, olhando para dentro
    const offset = 2; // distância fora do labirinto
    const x = window.posX ? window.posX[0] : centerCoord;
    const z = window.posZ ? window.posZ[0] - offset : centerCoord - offset;
    const px = x + (window.posX ? (window.posX[1] - window.posX[0]) / 2 : 0.5);
    const py = height;
    camera.position.set(px, py, z);
    camera.lookAt(px, py, window.posZ ? window.posZ[0] + 2 : centerCoord + 2);
    // Salva posição inicial
    initialPlayerPosition = new THREE.Vector3(px, py, z);
}

function resetPlayerToInitialPosition() {
    if (initialPlayerPosition) {
        controls.getObject().position.copy(initialPlayerPosition);
        velocity.set(0, 0, 0);
    }
}

function updateMarginsColor() {
    // Remove todas as margens antigas
    scene.children = scene.children.filter(
        (obj) => !obj.userData || obj.userData.type !== "margin"
    );
    // Redesenha as margens com a cor correta
    setFloors();
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
    if (window.creativeMode) {
        if (code === "Space" && window.creativeMode) {
            moveUp = true;
        }
        if (code === "ShiftLeft" && window.creativeMode) {
            moveDown = true;
        }
    } else {
        if (code === "ShiftLeft") {
            moveSlow = true;
        }
        if (code === "ControlLeft") {
            moveFast = true;
        }
    }
    if (code === "KeyC") {
        window.creativeMode = !window.creativeMode;
        updateMarginsColor();
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
    if (window.creativeMode) {
        if (code === "Space" && window.creativeMode) {
            moveUp = false;
        }
        if (code === "ShiftLeft" && window.creativeMode) {
            moveDown = false;
        }
    } else {
        if (code === "ShiftLeft") {
            moveSlow = false;
        }
        if (code === "ControlLeft") {
            moveFast = false;
        }
    }
}

function movementUpdate() {
    if (!controls.isLocked) return;

    // Ajusta moveSpeed conforme teclas pressionadas
    if (!window.creativeMode) {
        if (moveSlow) {
            moveSpeed = 10;
        } else if (moveFast) {
            moveSpeed = 30;
        } else {
            moveSpeed = 20;
        }
    } else {
        moveSpeed = 20;
    }

    const time = performance.now(); // current time
    const delta = (time - prevTime) / 1000; // different in time
    // calculate amount of time since last render , in seconds

    velocity.x -= velocity.x * speed * delta;
    velocity.z -= velocity.z * speed * delta;
    velocity.y -= velocity.y * speed * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

    if (window.creativeMode) {
        // in creative mode, player can fly
        if (moveUp) velocity.y += moveSpeed * delta;
        if (moveDown) velocity.y -= moveSpeed * delta;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;

    // Verifica se está sobre uma margem (modo sobrevivência)
    if (!window.creativeMode && isOnMargin(controls.getObject().position)) {
        resetPlayerToInitialPosition();
    }

    prevTime = time;
}

function isOnMargin(position) {
    // Retorna true se o jogador estiver a menos de 1 metro de qualquer parede ou círculo das margens
    if (!window.maze || !window.posX || !window.posZ) return false;
    const margin = 1;
    const rows = window.maze.length;
    const cols = window.maze[0].length;
    for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
            const cell = window.maze[z][x];
            const x0 = window.posX[x];
            const x1 = window.posX[x + 1];
            const z0 = window.posZ[z];
            const z1 = window.posZ[z + 1];
            // Parede superior
            if (cell.top) {
                const dist = Math.abs(position.z - z1);
                if (position.x >= x0 && position.x <= x1 && dist < margin) return true;
                // Círculos nas pontas
                const leftCircle = { x: x0, z: z1 };
                const rightCircle = { x: x1, z: z1 };
                if (Math.hypot(position.x - leftCircle.x, position.z - leftCircle.z) < margin)
                    return true;
                if (Math.hypot(position.x - rightCircle.x, position.z - rightCircle.z) < margin)
                    return true;
            }
            // Parede inferior
            if (cell.bottom) {
                const dist = Math.abs(position.z - z0);
                if (position.x >= x0 && position.x <= x1 && dist < margin) return true;
                // Círculos nas pontas
                const leftCircle = { x: x0, z: z0 };
                const rightCircle = { x: x1, z: z0 };
                if (Math.hypot(position.x - leftCircle.x, position.z - leftCircle.z) < margin)
                    return true;
                if (Math.hypot(position.x - rightCircle.x, position.z - rightCircle.z) < margin)
                    return true;
            }
            // Parede esquerda
            if (cell.left) {
                const dist = Math.abs(position.x - x0);
                if (position.z >= z0 && position.z <= z1 && dist < margin) return true;
                // Círculos nas pontas
                const topCircle = { x: x0, z: z1 };
                const bottomCircle = { x: x0, z: z0 };
                if (Math.hypot(position.x - topCircle.x, position.z - topCircle.z) < margin)
                    return true;
                if (Math.hypot(position.x - bottomCircle.x, position.z - bottomCircle.z) < margin)
                    return true;
            }
            // Parede direita
            if (cell.right) {
                const dist = Math.abs(position.x - x1);
                if (position.z >= z0 && position.z <= z1 && dist < margin) return true;
                // Círculos nas pontas
                const topCircle = { x: x1, z: z1 };
                const bottomCircle = { x: x1, z: z0 };
                if (Math.hypot(position.x - topCircle.x, position.z - topCircle.z) < margin)
                    return true;
                if (Math.hypot(position.x - bottomCircle.x, position.z - bottomCircle.z) < margin)
                    return true;
            }
        }
    }
    return false;
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
    const corridorWidthsX = Array.from({ length: cols + 1 }, () => Math.random() * 2 + 1.9); // 1,8 a 3 metros
    const corridorWidthsZ = Array.from({ length: rows + 1 }, () => Math.random() * 2 + 1.9); // 1,8 a 3 metros

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

    function drawMarginRectAndCircles(cx, cz, w, h, isHorizontal, marginMaterial) {
        // Retângulo central
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), marginMaterial);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx, 0.03, cz);
        mesh.userData = { type: "margin" };
        scene.add(mesh);
        // Círculos nas pontas
        const r = isHorizontal ? h / 2 : w / 2;
        if (isHorizontal) {
            for (const px of [cx - w / 2, cx + w / 2]) {
                const circle = new THREE.Mesh(new THREE.CircleGeometry(r, 32), marginMaterial);
                circle.rotation.x = -Math.PI / 2;
                circle.position.set(px, 0.031, cz);
                circle.userData = { type: "margin" };
                scene.add(circle);
            }
        } else {
            for (const pz of [cz - h / 2, cz + h / 2]) {
                const circle = new THREE.Mesh(new THREE.CircleGeometry(r, 32), marginMaterial);
                circle.rotation.x = -Math.PI / 2;
                circle.position.set(cx, 0.031, pz);
                circle.userData = { type: "margin" };
                scene.add(circle);
            }
        }
    }

    // Desenha margens 360 graus ao redor de cada parede, com círculos completos nas pontas
    const margin = 1;
    const marginColor = window.creativeMode ? 0x226622 : 0x662222;
    const marginMaterial = new THREE.MeshBasicMaterial({
        color: marginColor,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
    });
    for (let z = 0; z < posZ.length - 1; z++) {
        for (let x = 0; x < posX.length - 1; x++) {
            const x0 = posX[x];
            const x1 = posX[x + 1];
            const z0 = posZ[z];
            const z1 = posZ[z + 1];
            // Superior
            if (window?.maze?.[z]?.[x]?.top) {
                const cx = (x0 + x1) / 2;
                const cz = z1 - wallThin / 2;
                const w = x1 - x0;
                const h = wallThin + 2 * margin;
                drawMarginRectAndCircles(cx, cz, w, h, true, marginMaterial);
            }
            // Inferior
            if (window?.maze?.[z]?.[x]?.bottom) {
                const cx = (x0 + x1) / 2;
                const cz = z0 + wallThin / 2;
                const w = x1 - x0;
                const h = wallThin + 2 * margin;
                drawMarginRectAndCircles(cx, cz, w, h, true, marginMaterial);
            }
            // Esquerda
            if (window?.maze?.[z]?.[x]?.left) {
                const cx = x0 + wallThin / 2;
                const cz = (z0 + z1) / 2;
                const w = wallThin + 2 * margin;
                const h = z1 - z0;
                drawMarginRectAndCircles(cx, cz, w, h, false, marginMaterial);
            }
            // Direita
            if (window?.maze?.[z]?.[x]?.right) {
                const cx = x1 - wallThin / 2;
                const cz = (z0 + z1) / 2;
                const w = wallThin + 2 * margin;
                const h = z1 - z0;
                drawMarginRectAndCircles(cx, cz, w, h, false, marginMaterial);
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
    const creativeMode = false; // true = modo criativo, false = modo sobrevivência
    window.creativeMode = creativeMode;

    const dificulty = 10;
    const centerCoord = (dificulty - 1) / 2;
    const maze = generateMaze(dificulty, dificulty);

    // Remove a parede superior da célula inicial (entrada) e a parede inferior da célula final (saída)
    maze[dificulty - 1][0].bottom = false; // entrada canto inferior esquerdo
    maze[0][dificulty - 1].top = false; // saída canto superior direito

    setScene();
    setMaze(maze); // Precisa ser antes da câmera para garantir posX/posZ
    setCamera(centerCoord);
    setControls();

    setBackground();
    setFloors();
    setLights();

    animate();

    document.addEventListener("click", () => {
        if (controls) controls.lock();
        else console.warn("null/undefined controls");
    });
}

window.onload = init;
