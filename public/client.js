//
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var protocol = location.protocol === "https:" ? "wss:" : "ws:";
var socket = new WebSocket("".concat(protocol, "//").concat(location.host, "/ws"));
var myId = null;
var players = {};
var obstacles = []; //store obstacles 
socket.addEventListener("message", function (event) {
    var msg = JSON.parse(event.data);
    if (msg.type === "init") {
        myId = msg.id;
        players = msg.players;
        obstacles = msg.obstacles || []; //recieve obstacles once
        console.log(obstacles);
    }
    else if (msg.type === "join") {
        players[msg.player.id] = msg.player;
    }
    else if (msg.type === "update") {
        players[msg.player.id] = msg.player;
    }
    else if (msg.type === "leave") {
        delete players[msg.id];
    }
});
document.addEventListener("keydown", function (e) {
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1) {
        socket.send(JSON.stringify({ type: "move", dir: keyToDir(e.key) }));
    }
});
document.getElementById("controls").addEventListener("click", function (e) {
    var target = e.target;
    if (target.tagName === "BUTTON") {
        var dir = target.id;
        socket.send(JSON.stringify({ type: "move", dir: dir }));
    }
});
function keyToDir(key) {
    switch (key) {
        case "w":
        case "ArrowUp": return "up";
        case "s":
        case "ArrowDown": return "down";
        case "a":
        case "ArrowLeft": return "left";
        case "d":
        case "ArrowRight": return "right";
        default: return "";
    }
}
function gameLoop() {
    ctx.fillStyle = "pink";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var id in players) {
        var p = players[id];
        if (p.it) {
            ctx.fillStyle = "white";
            ctx.fillRect(p.x - 2, p.y - 2, 24, 24);
        }
        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }
    ctx.fillStyle = "#180a29";
    for (var _i = 0, obstacles_1 = obstacles; _i < obstacles_1.length; _i++) {
        var o = obstacles_1[_i];
        ctx.fillRect(o.x, o.y, o.width, o.height);
    }
    requestAnimationFrame(gameLoop);
}
gameLoop();
