interface Player {
  id: string;
  x: number;
  y: number;
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${location.host}/ws`);
let myId: string | null = null;
let players: Record<string, Player> = {};

socket.addEventListener("message", (event: MessageEvent) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "init") {
    myId = msg.id;
    players = msg.players;
  } else if (msg.type === "join") {
    players[msg.player.id] = msg.player;
  } else if (msg.type === "update") {
    players[msg.player.id] = msg.player;
  } else if (msg.type === "leave") {
    delete players[msg.id];
  }
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1) {
    socket.send(JSON.stringify({ type: "move", dir: keyToDir(e.key) }));
  }
});

document.getElementById("controls")!.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLButtonElement;
    if (target.tagName === "BUTTON") {
        const dir = target.id;
        socket.send(JSON.stringify({ type: "move", dir }));
    }
});

function keyToDir(key: string): string {
  switch (key) {
    case "w": case "ArrowUp": return "up";
    case "s": case "ArrowDown": return "down";
    case "a": case "ArrowLeft": return "left";
    case "d": case "ArrowRight": return "right";
    default: return "";
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = id === myId ? "blue" : "red";
    ctx.fillRect(p.x, p.y, 20, 20);
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();
