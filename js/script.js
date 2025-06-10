function resizeCanvas() {
  const canvas = document.getElementById('maze');
  const containerWidth = Math.min(window.innerWidth * 0.98, 600);
  canvas.style.width = containerWidth + 'px';
  canvas.style.height = (containerWidth * 428 / 600) + 'px';
}

window.addEventListener('resize', resizeCanvas);

const canvasWidth = 600;
const canvasHeight = 428;
const cols = 30;
const rows = 21;
const tileSizeX = Math.floor(canvasWidth / cols);
const tileSizeY = Math.floor(canvasHeight / rows);

let maze = [];
let player = { x: 1, y: 1 };
let goal = { x: cols - 2, y: rows - 2 };
let showPath = false;
let solutionPath = [];
let currentPathIndex = 0;
let passosFe = 0;
let usandoFe = false;

const playerImg = new Image();
playerImg.src = 'https://forcajovemuniversal.com/wp-content/uploads/2021/02/patch_universitarios-1536x1536.png';
playerImg.crossOrigin = 'anonymous';

function generateMazeWithMultiplePaths(cols, rows) {
  const maze = Array.from({ length: rows }, () => Array(cols).fill(1));
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function carve(x, y) {
    maze[y][x] = 0;
    const dirs = shuffle([[0, -2], [0, 2], [-2, 0], [2, 0]]);
    for (let [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (ny > 0 && ny < rows && nx > 0 && nx < cols && maze[ny][nx] === 1) {
        maze[y + dy/2][x + dx/2] = 0;
        carve(nx, ny);
      }
    }
  }
  carve(1, 1);
  maze[1][0] = 0;
  maze[rows - 2][cols - 1] = 0;
  const extraPaths = Math.floor(cols * 1.5);
  for (let i = 0; i < extraPaths; i++) {
    const x = Math.floor(Math.random() * (cols - 2)) + 1;
    const y = Math.floor(Math.random() * (rows - 2)) + 1;
    if (maze[y][x] === 1) {
      let openSides = 0;
      for (let [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
        if (maze[y + dy][x + dx] === 0) openSides++;
      }
      if (openSides >= 2) maze[y][x] = 0;
    }
  }
  return maze;
}

function findPathBFS(maze, start, end) {
  const queue = [[start]];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  visited[start.y][start.x] = true;
  while (queue.length) {
    const path = queue.shift();
    const { x, y } = path[path.length - 1];
    if (x === end.x && y === end.y) return path;
    for (let [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 0 && !visited[ny][nx]) {
        visited[ny][nx] = true;
        queue.push(path.concat({ x: nx, y: ny }));
      }
    }
  }
  return [];
}

function drawMaze() {
  const canvas = document.getElementById('maze');
  const ctx = canvas.getContext('2d');
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  const scaleX = canvas.width / canvasWidth;
  const scaleY = canvas.height / canvasHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = maze[y][x] === 1 ? 'rgba(139,94,60,0.7)' : '#fff';
      ctx.fillRect(
        x * tileSizeX * scaleX,
        y * tileSizeY * scaleY,
        tileSizeX * scaleX,
        tileSizeY * scaleY
      );
    }
  }

  if (showPath && solutionPath.length) {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 4 * Math.max(scaleX, scaleY);
    ctx.beginPath();
    for (let i = currentPathIndex; i < solutionPath.length; i++) {
      const { x, y } = solutionPath[i];
      const cx = x * tileSizeX * scaleX + (tileSizeX * scaleX) / 2;
      const cy = y * tileSizeY * scaleY + (tileSizeY * scaleY) / 2;
      i === currentPathIndex ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  ctx.fillStyle = 'green';
  ctx.fillRect(
    goal.x * tileSizeX * scaleX + 4 * scaleX,
    goal.y * tileSizeY * scaleY + 4 * scaleY,
    tileSizeX * scaleX - 8 * scaleX,
    tileSizeY * scaleY - 8 * scaleY
  );

  if (playerImg.complete && playerImg.naturalWidth > 0) {
    const margin = Math.min(tileSizeX * scaleX, tileSizeY * scaleY) * 0.1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      playerImg,
      player.x * tileSizeX * scaleX + margin,
      player.y * tileSizeY * scaleY + margin,
      tileSizeX * scaleX - 2 * margin,
      tileSizeY * scaleY - 2 * margin
    );
  } else {
    ctx.fillStyle = 'red';
    ctx.fillRect(
      player.x * tileSizeX * scaleX + 4 * scaleX,
      player.y * tileSizeY * scaleY + 4 * scaleY,
      tileSizeX * scaleX - 8 * scaleX,
      tileSizeY * scaleY - 8 * scaleY
    );
  }

  const passosDiv = document.getElementById('passos-fe');
  passosDiv.textContent = usandoFe && passosFe > 0 ? `Passos de fé: ${passosFe}` : '';
}

function movePlayer(dx, dy) {
  const newX = player.x + dx;
  const newY = player.y + dy;
  if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && maze[newY][newX] === 0) {
    if (usandoFe && solutionPath.length &&
        currentPathIndex < solutionPath.length - 1 &&
        solutionPath[currentPathIndex + 1].x === newX &&
        solutionPath[currentPathIndex + 1].y === newY) {
      currentPathIndex++;
      passosFe++;
    }
    player.x = newX;
    player.y = newY;
    drawMaze();
    if (player.x === goal.x && player.y === goal.y) {
      document.getElementById('victory-popup').style.display = 'flex';
      document.getElementById('victory-close').onclick = () => {
        document.getElementById('victory-popup').style.display = 'none';
      };
    }
  }
}

function toggleFaithPath() {
  if (showPath) {
    showPath = false;
    usandoFe = false;
    passosFe = 0;
  } else {
    solutionPath = findPathBFS(maze, player, goal);
    showPath = true;
    usandoFe = true;
    passosFe = 0;
    currentPathIndex = solutionPath.findIndex(p => p.x === player.x && p.y === player.y);
  }
  drawMaze();
}

document.getElementById('btn-help').onclick = () => document.getElementById('help-popup').style.display = 'flex';
document.getElementById('help-close').onclick = () => document.getElementById('help-popup').style.display = 'none';
document.getElementById('btn-restart').onclick = startGame;
document.getElementById('btn-reset').onclick = () => {
  player = { x: 1, y: 1 };
  showPath = false;
  usandoFe = false;
  passosFe = 0;
  currentPathIndex = 0;
  drawMaze();
};
document.getElementById('faithBtn').onclick = toggleFaithPath;

document.getElementById('upBtn').onclick = () => movePlayer(0, -1);
document.getElementById('downBtn').onclick = () => movePlayer(0, 1);
document.getElementById('leftBtn').onclick = () => movePlayer(-1, 0);
document.getElementById('rightBtn').onclick = () => movePlayer(1, 0);

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') movePlayer(0, -1);
  else if (e.key === 'ArrowDown') movePlayer(0, 1);
  else if (e.key === 'ArrowLeft') movePlayer(-1, 0);
  else if (e.key === 'ArrowRight') movePlayer(1, 0);
  else if (e.key.toLowerCase() === 'f') toggleFaithPath();
});

playerImg.onload = () => drawMaze();

function startGame() {
  maze = generateMazeWithMultiplePaths(cols, rows);
  player = { x: 1, y: 1 };
  goal = { x: cols - 2, y: rows - 2 };
  solutionPath = [];
  showPath = false;
  currentPathIndex = 0;
  usandoFe = false;
  passosFe = 0;
  drawMaze();
}

window.addEventListener('keydown', function(e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  startGame();
});
window.addEventListener('resize', resizeCanvas);
