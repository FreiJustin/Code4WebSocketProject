interface Player {
  id: string;
  x: number;
  y: number;
  it: boolean;
}

interface Coords{
  x:number;
  y:number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const players: Record<string, Player> = {};
const sockets = new Map<string, WebSocket>();

let it:string="";

const canvas={height:400,width:600};
const obstacles: Obstacle[] = generateObstacles(5);

function generateObstacles(count: number): Obstacle[] {
  const obs: Obstacle[] = [];
  const margin = 20;  //distance from edges
  for (let i = 0; i < count; i++) {
    const width = (5 + Math.floor(Math.random() * 11)) * 10;   // 50..150
    const height = (5 + Math.floor(Math.random() * 11)) * 10;

    const maxX = canvas.width - width - margin;
    const maxY = canvas.height - height - margin;

    const xSteps = Math.floor((maxX - margin) / 10) + 1; // number of 10px steps
    const ySteps = Math.floor((maxY - margin) / 10) + 1;

    const x = margin + Math.floor(Math.random() * xSteps) * 10;
    const y = margin + Math.floor(Math.random() * ySteps) * 10;
    obs.push({ x, y, width, height });
  }
  return obs;
}

function rectsOverlap(p: { x: number; y: number; width: number; height: number },
  o: { x: number; y: number; width: number; height: number }): boolean {
  return !(
    p.x + p.width <= o.x ||
    p.x >= o.x + o.width ||
    p.y + p.height <= o.y ||
    p.y >= o.y + o.height
  );
}

function broadcast(message: unknown, except?: string) {
  for (const [id, socket] of sockets) {
    if (id !== except) {
      socket.send(JSON.stringify(message));
    }
  }
}

Deno.serve((request) => {
  const { pathname } = new URL(request.url);

  // Static file serving
  if (pathname === "/") {
    return new Response(Deno.readTextFileSync("./public/index.html"), {
      headers: { "content-type": "text/html" },
    });
  }

  if (pathname === "/client.js") {
    return new Response(Deno.readTextFileSync("./public/client.js"), {
      headers: { "content-type": "application/javascript" },
    });
  }

  // WebSocket for game
  if (pathname === "/ws") {
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response(null, { status: 501 });
    }
    const { socket, response } = Deno.upgradeWebSocket(request);
    const id = crypto.randomUUID();
    

    const spawn: Coords = rollSpawn();

    let shouldBeIt:boolean=false;
    if(it===""){
      shouldBeIt=true;
      it=id;
    }

    

    players[id] = { id, x: spawn.x, y: spawn.y , it:shouldBeIt};
    console.log(players[id]);
    sockets.set(id, socket);

    socket.addEventListener("open", () => {
      console.log(`Player ${id} connected`);
      socket.send(JSON.stringify({ type: "init", id, players, obstacles }));
      broadcast({ type: "join", player: players[id] }, id);
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "move") {
        const p = players[id];
        const oldX = p.x;
        const oldY = p.y;
        if (!p) return;
        if (msg.dir === "up") p.y -= 10;
        if (msg.dir === "down") p.y += 10;
        if (msg.dir === "left") p.x -= 10;
        if (msg.dir === "right") p.x += 10;

        if (p.y>canvas.height){
          p.y=p.y-canvas.height;
        }
        else if(p.y<0){
          p.y=canvas.height+p.y;
        }
        else if (p.x > canvas.width) {
          p.x = p.x - canvas.width;
        }
        else if (p.x < 0) {
          p.x = canvas.width + p.x;
        }

        //player obstacle collision
        const playerRect = { x: p.x, y: p.y, width: 20, height: 20 };
        let collided = false;
        for (const o of obstacles) {
          if (rectsOverlap(playerRect, o)) {
            collided = true;
            break;
          }
        }
        if (collided) { // Revert if collided
          p.x = oldX;
          p.y = oldY;
        }
        broadcast({ type: "update", player: p });
      }
    });

    socket.addEventListener("close", () => {
      console.log(`Player ${id} disconnected`);
      if (players[id].it&&Object.keys(players).length>1){
        const playerIDs:string[]=Object.keys(players);
        playerIDs.splice(playerIDs.indexOf(it),1);
        const newIt:string=playerIDs[Math.floor(Math.random()*playerIDs.length)];
        players[newIt].it=true;
        it=newIt;
      }
      else{
        it="";
      }
      delete players[id];
      sockets.delete(id);
      broadcast({ type: "leave", id });
    });

    return response;
  }

  return new Response("Not found", { status: 404 });
});

function rollSpawn(): Coords { //vielleicht funktionierts vielleicht nicht
  let position:Coords;
  if (Math.random() < 0.5) {
    if (Math.random() < 0.5) {
      position= { x: Math.random() * canvas.width, y: 10 }
    }
    else {
      position= { x: Math.random() * canvas.width, y: canvas.height - 10 }
    }

  }
  else {
    if (Math.random() < 0.5) {
      position= { x: 10, y: Math.random() * canvas.height }
    }
    else {
      position= { x: canvas.width - 10, y: Math.random() * canvas.height }
    }
  }
  if (it!=""){
    if (Math.pow((Math.pow((position.x - players[it].x), 2) + Math.pow(position.y - players[it].y, 2)), 0.5) < 50) {
      position = rollSpawn();
    }
  }
  
  return position;
  
}

