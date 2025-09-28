const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State & Configuration ---
let gold = 250;
let health = 20;
let wave = 0;
let enemies = [];
let towers = [];
let projectiles = [];
let selectedTowerType = null;
let waveInProgress = false;

const TOWER_TYPES = {
    FIRE: { name: 'FIRE', cost: 100, color: '#e74c3c', range: 100, damage: 1, fireRate: 60, projectileSpeed: 5 },
    ICE: { name: 'ICE', cost: 120, color: '#3498db', range: 80, damage: 0.5, fireRate: 90, projectileSpeed: 4, slow: 0.5 }
};

// --- Game Path (Hardcoded for simplicity) ---
const path = [
    { x: 0, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 100 },
    { x: 600, y: 100 }, { x: 600, y: 500 }, { x: 800, y: 500 }
];

// --- UI Elements ---
const goldDisplay = document.getElementById('gold');
const healthDisplay = document.getElementById('health');
const waveDisplay = document.getElementById('wave');
const fireTowerBtn = document.getElementById('fire-tower-btn');
const iceTowerBtn = document.getElementById('ice-tower-btn');
const startWaveBtn = document.getElementById('start-wave-btn');

// --- Classes ---
class Enemy {
    constructor(hp, speed) {
        this.x = path.x;
        this.y = path.y;
        this.radius = 10;
        this.maxHp = hp;
        this.hp = hp;
        this.speed = speed;
        this.originalSpeed = speed;
        this.pathIndex = 1;
        this.slowTimer = 0;
    }

    move() {
        if (this.pathIndex >= path.length) return;
        
        if (this.slowTimer > 0) {
            this.speed = this.originalSpeed * TOWER_TYPES.ICE.slow;
            this.slowTimer--;
        } else {
            this.speed = this.originalSpeed;
        }

        const target = path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw() {
        // Body
        ctx.fillStyle = this.speed < this.originalSpeed ? '#74b9ff' : '#2ecc71';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Health bar
        const healthBarWidth = 30;
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - 20, healthBarWidth, 5);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - 20, healthBarWidth * (this.hp / this.maxHp), 5);
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.cooldown = 0;
    }

    findTarget() {
        let closestEnemy = null;
        let minDistance = Infinity;
        for (const enemy of enemies) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.type.range && distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        }
        return closestEnemy;
    }

    update() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }
        const target = this.findTarget();
        if (target) {
            projectiles.push(new Projectile(this.x, this.y, target, this.type));
            this.cooldown = this.type.fireRate;
        }
    }
    
    draw() {
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        // Draw range indicator on hover
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.type.range, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class Projectile {
    constructor(x, y, target, towerType) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.type = towerType;
        this.speed = towerType.projectileSpeed;
    }

    move() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.speed) {
            this.x = this.target.x;
            this.y = this.target.y;
            return true; // Hit
        }
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        return false;
    }
    
    draw() {
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Game Logic Functions ---
function startNextWave() {
    if (waveInProgress) return;
    wave++;
    waveInProgress = true;
    startWaveBtn.disabled = true;

    const numEnemies = 10 + wave * 5;
    const enemyHp = 50 + wave * 20;
    const enemySpeed = 1 + wave * 0.1;

    for (let i = 0; i < numEnemies; i++) {
        setTimeout(() => {
            enemies.push(new Enemy(enemyHp, enemySpeed));
        }, i * 500);
    }
}

function updateUI() {
    goldDisplay.textContent = gold;
    healthDisplay.textContent = health;
    waveDisplay.textContent = wave;
}

function drawPath() {
    ctx.strokeStyle = '#a0522d';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(path.x, path.y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for(let i = 50; i < canvas.width; i+= 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for(let i = 50; i < canvas.height; i+= 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPath();
    drawGrid();

    towers.forEach(t => t.draw());
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());

    if (selectedTowerType) {
        ctx.fillStyle = selectedTowerType.color + '80'; // semi-transparent
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, selectedTowerType.range, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function gameLoop() {
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.move();
        if (enemy.pathIndex >= path.length) {
            health--;
            enemies.splice(i, 1);
            if (health <= 0) {
                alert("Game Over!");
                return;
            }
        }
    }
    
    // Update towers and projectiles
    towers.forEach(t => t.update());
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (p.move()) {
            p.target.hp -= p.type.damage;
            if (p.type.slow) p.target.slowTimer = 120; // slow for 2 seconds

            if (p.target.hp <= 0) {
                const index = enemies.indexOf(p.target);
                if (index > -1) {
                    enemies.splice(index, 1);
                    gold += 10;
                }
            }
            projectiles.splice(i, 1);
        }
    }
    
    // Check if wave is over
    if (waveInProgress && enemies.length === 0) {
        waveInProgress = false;
        startWaveBtn.disabled = false;
        gold += 100 + wave * 10; // End of wave bonus
    }

    updateUI();
    draw();
    requestAnimationFrame(gameLoop);
}


// --- Event Listeners ---
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (selectedTowerType) {
        if (gold >= selectedTowerType.cost) {
            gold -= selectedTowerType.cost;
            towers.push(new Tower(mouse.x, mouse.y, selectedTowerType));
            selectedTowerType = null;
        }
    }
});

fireTowerBtn.addEventListener('click', () => selectedTowerType = TOWER_TYPES.FIRE);
iceTowerBtn.addEventListener('click', () => selectedTowerType = TOWER_TYPES.ICE);
startWaveBtn.addEventListener('click', startNextWave);


// --- Start Game ---
updateUI();
gameLoop();
