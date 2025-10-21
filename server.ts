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

const players: Record<string, Player> = {};
const sockets = new Map<string, WebSocket>();

let it:string="";

const canvas={height:400,width:600};

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
      socket.send(JSON.stringify({ type: "init", id, players }));
      broadcast({ type: "join", player: players[id] }, id);
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "move") {
        const p = players[id];
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

