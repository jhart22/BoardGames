const Express = require("express")();
const Http = require("http").Server(Express);
const io = require("socket.io")(Http);
const _ = require('lodash');
const mysql = require('mysql');

var database = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'reversi'
});


var users;
var grid;
var blackScore;
var whiteScore;
var turn;

const WIDTH = 8;
const HEIGHT = 8;

//manage all client signals
io.on("connection", socket =>{

  socket.emit("users", clientUserList());

  //send leaderboards
  database.query("SELECT winner FROM matches", function (err, result, fields) {
    if (err) throw err;
    socket.emit("scores",JSON.stringify(result));
  });
  
  socket.on("move", move=>{
    if(users[socket.id] && users[socket.id].color == turn){
      input(move.x,move.y);
      sendDataToUsers();
    }
  });

  socket.on("reset", function(){
    if(users[socket.id] && users[socket.id].color){
      resetGame();
      sendDataToUsers()
    }
  });

  socket.on("name", name=>{
    if(!_.find(users, function(u){ return u.name == name;})){
      users[socket.id] = {'name' : name, 'color': undefined };
      console.log(users);
      socket.join('users');
      socket.emit('activate');
      io.emit("users", clientUserList());
      socket.emit("data", {grid, blackScore, whiteScore, turn});
    }
  });

  socket.on("disconnect", reason=>{
    if(users[socket.id]){
      console.log(users[socket.id].name + " disconnected! Removing from list");
      delete users[socket.id];
      io.emit("users", clientUserList());
    }
  });

  socket.on("joinReq", color=>{
    if(users[socket.id] && !_.find(users, u=>{ return u.color == color;})){
      users[socket.id].color = color;
      io.emit("users", clientUserList());
    }
  });

  socket.on("drop", ()=>{
    if(users[socket.id] && users[socket.id].color){
      users[socket.id].color = undefined;
      io.emit("users", clientUserList());
    }
  })
});

Http.listen(3000, () => {
  users = {};
  initGameboard();
  initGameState();
  console.log("Listening at :3000...");

  console.log("Connecting to MySQL server...");
  database.connect();

  matchHistory();
});

function initGameboard(){
  grid = [];
  for(let i = 0; i < WIDTH; i++){
    grid[i] = [];
    for(let j = 0; j < HEIGHT; j++){
      grid[i][j] = undefined;
    }
  }

  grid[3][3] = "white";
  grid[4][3] = "black";
  grid[3][4] = "black";
  grid[4][4] = "white";
}

function initGameState(){
  blackScore = 2;
  whiteScore = 2;
  turn = "black";
}

function opponent(){
  if(turn == "white")
    return "black";
  else 
    return "white";
}

function updateGrid(x, y){
  grid[x][y] = turn;

  if(turn == "black")
    blackScore++;
  else
    whiteScore++;
}

  //changes score when pieces are captured
function capture(){
  if(turn == "black"){
    blackScore++;
    whiteScore--;
  }
  else{
    whiteScore++;
    blackScore--;
  }
}

//draws updates to boardstate
function updateAxes(x, y){
  //right
  if(checkRight(x,y)){
    for(let i = x+1; i < WIDTH && grid[i][y] == opponent(); i++){
      grid[i][y] = turn;
      capture();
    }
  }

  //up
  if(checkUp(x,y)){
    for(let i = y-1; i > 0 && grid[x][i] == opponent(); i--){
      grid[x][i] = turn;
      capture();
    }
  }

  //left
  if(checkLeft(x,y)){
    for(let i = x-1; i > 0 && grid[i][y] == opponent(); i--){
      grid[i][y] = turn;
      capture();
    }
  }

  //down
  if(checkDown(x,y)){
    for(let i = y+1; i < HEIGHT && grid[x][i] == opponent(); i++){
      grid[x][i] = turn;
      capture();
    }
  }

  //topright
  if(checkTopRight(x,y)){
    let maxDistance = Math.min(WIDTH -1 - x, y);
    for(let i = 1; i <= maxDistance && grid[x+i][y-i] == opponent(); i++){
      grid[x+i][y-i] = turn;
      capture();
    }
  }

  //topleft
  if(checkTopLeft(x,y)){
    let maxDistance = Math.min(x, y);
    for(let i = 1; i <= maxDistance && grid[x-i][y-i] == opponent(); i++){
      grid[x-i][y-i] = turn;
      capture();
    }
  }

  //bottomleft
  if(checkBottomLeft(x,y)){
    let maxDistance = Math.min(x, HEIGHT -1 -y);
    for(let i = 1; i <= maxDistance && grid[x-i][y+i] == opponent(); i++){
      grid[x-i][y+i] = turn;
      capture();
    }
  }

  //bottomright
  if(checkBottomRight(x,y)){
    let maxDistance = Math.min(WIDTH -1 - x, WIDTH -1 -y);
    for(let i = 1; i <= maxDistance && grid[x+i][y+i] == opponent(); i++){
      grid[x+i][y+i] = turn;
      capture();
    }
  }
}

function checkLegality(x, y){
  
  return grid[x][y] == undefined && (checkLeft(x,y) || checkRight(x,y) || checkUp(x,y) || checkDown(x,y) || checkBottomLeft(x,y)
    || checkBottomRight(x,y) || checkTopRight(x,y) || checkTopLeft(x,y));

}

function checkLeft(x, y){
  for(let i = x-2; i >= 0; i--){
    if(grid[i][y] === undefined)
      return false;
    if(grid[i][y] == turn && grid[x-1][y] == opponent())
      return true;
  }

  return false;
}

function checkRight(x, y){
  for(let i = x+2; i < WIDTH; i++){
    if(grid[i][y] === undefined)
      return false;
    if(grid[i][y] == turn && grid[x+1][y] == opponent())
      return true;
  }

  return false;
}

function checkUp(x, y){
  //check up
  for(let i = y-2; i >= 0; i--){
    if(grid[x][i] === undefined)
      return false;
    if(grid[x][i] == turn && grid[x][y-1] == opponent())
      return true;
  }

  return false;
}

function checkDown(x, y){
  for(let i = y+2; i < HEIGHT; i++){
    if(grid[x][i] === undefined)
      return false;
    if(grid[x][i] == turn && grid[x][y+1] == opponent())
      return true;
  }

  return false;
}

function checkTopLeft(x, y){
  let maxDistance = Math.min(x, y);
  for(let i = 2; i <= maxDistance; i++){
    if(grid[x-i][y-i] === undefined)
      return false;
    if(grid[x-i][y-i] == turn && grid[x-1][y-1] == opponent())
      return true;
  }

  return false;
}

function checkTopRight(x, y){
  let maxDistance = Math.min(WIDTH -1 - x, y);
  for(let i = 2; i <= maxDistance; i++){
    if(grid[x+i][y-i] === undefined)
      return false;
    if(grid[x+i][y-i] == turn && grid[x+1][y-1] == opponent())
      return true;
  }

  return false;
}

function checkBottomRight(x, y){
  let maxDistance = Math.min(WIDTH -1 - x, HEIGHT -1 -y);
  for(let i = 2; i <= maxDistance; i++){
    if(grid[x+i][y+i] === undefined)
      return false;
    if(grid[x+i][y+i] == turn && grid[x+1][y+1] == opponent())
      return true;
  }

  return false;
}

function checkBottomLeft(x, y){
  let maxDistance = Math.min(x, HEIGHT -1 -y);
  for(let i = 2; i <= maxDistance; i++){
    if(grid[x-i][y+i] === undefined)
      return false;
    if(grid[x-i][y+i] == turn && grid[x-1][y+1] == opponent())
      return true;
  }

  return false;
}

//runs checks on the grid space clicked to determine if it is a legal move, and makes the move if so
function input(x, y){
  
  
  try{
    if(checkLegality(x,y)){
      updateGrid(x,y);
      updateAxes(x,y);
      toggleTurn();
      setTimeout(countAvailableMoves, 750);
    }
  }catch(e){
    console.log(e);
  }
}

function toggleTurn(){
  turn = opponent();
}

function countAvailableMoves(){

  let available = 0;

  for(let i = 0; i < WIDTH; i++){
    for(let j = 0; j < HEIGHT; j++){
      if(checkLegality(i,j)){
        available++;
      }
    }
  }

  console.log("Available moves: " + available);
  if(available == 0 && blackScore + whiteScore < 64){
    checkMovesBase();
  }
  else{
    checkScore();
  }
}

function checkMovesBase() {
  
  toggleTurn();

  let available = 0;

  for(let i = 0; i < WIDTH; i++){
    for(let j = 0; j < HEIGHT; j++){
      if(checkLegality(i,j)){
        available++;
      }
    }
  }

  if(available == 0){
    if(blackScore > whiteScore){
      io.emit("end", "black");
      database.query('INSERT INTO matches(winner) VALUES("'+_.find(users, u=>{ return u.color == "black";}).name+'");');
    }
    else if(blackScore < whiteScore){
      io.emit("end", "white");
      database.query('INSERT INTO matches(winner) VALUES("'+_.find(users, u=>{ return u.color == "white";}).name+'");');
    }
    else{
      io.emit("end", "tie");
    }
  }
  else{
    io.emit("noMoves");
    sendDataToUsers();
  }
}

function sendDataToUsers(){
  io.to('users').emit("data", {grid, blackScore, whiteScore, turn});
}

function checkScore(){
  if(blackScore + whiteScore == 64){
    if(blackScore > whiteScore){
      io.emit("end", "black");
      database.query('INSERT INTO matches(winner) VALUES("'+_.find(users, u=>{ return u.color == "black";}).name+'");');
    }
    else if(blackScore < whiteScore){
      io.emit("end", "white");
      database.query('INSERT INTO matches(winner) VALUES("'+_.find(users, u=>{ return u.color == "white";}).name+'");');
    }
    else{
      io.emit("end", "tie");
    }
  }
}
  
function resetGame(){
  initGameState();
  initGameboard();
  console.log("Gameboard reset!");
  sendDataToUsers();
}

function clientUserList(){
  let list = [];
  _.each(users, user => {
    list.push({'name' : user.name, 'color': user.color});
  });

  return list;
}

function matchHistory(){
  database.query("SELECT winner FROM matches", function (err, result, fields) {
    if (err) throw err;
    console.log(JSON.stringify(result));
    return JSON.stringify(result);
  });
}