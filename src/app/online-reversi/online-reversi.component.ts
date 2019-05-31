import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import io from "socket.io-client";

@Component({
  selector: 'app-online-reversi',
  templateUrl: './online-reversi.component.html',
  styleUrls: ['./online-reversi.component.css']
})
export class OnlineReversiComponent implements OnInit {

  //reference to the game canvas
  @ViewChild('canvas') public canvas: ElementRef;

  //the Socket.io socket that conneccts to the game server
  private socket: any;


  //the width of each cell in the grid
  private cellPixelWidth = 80;
  private cellPixelHeight = 80;

  //the number of cells wide and high
  private gridCellWidth = 8;
  private gridCellHeight = 8;

  //divide these values by 30 to get the size of the grid in blocks
  private gridPixelWidth: number = (this.cellPixelWidth * this.gridCellWidth) + 1;
  private gridPixelHeight: number = (this.cellPixelHeight * this.gridCellHeight) + 1;
  
  private padding = 12;
  private context: CanvasRenderingContext2D;

  //keeps track of which player's turn it is
  private turn;
  private blackScore;
  private whiteScore;
  private grid;


  constructor() {
  }

  ngOnInit() {
    //connect the component to the reversi server
    this.socket = io("http://localhost:3000");
  }

  ngAfterViewInit(){
    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    this.context = canvasEl.getContext('2d');

    canvasEl.width = this.gridPixelWidth;
    canvasEl.height = this.gridPixelHeight;

    this.socket.on("data", data=>{
      this.parseSeverData(data);
      this.updateGridGraphics();
    });

    this.socket.on("noMoves", function(){
      alert(this.turn + " has no moves available!\nPassing turn to " + this.opponent());
    })

    this.socket.on("end", winner=>{
      this.endGame(winner);
    })

    this.createGrid();
  }

  private createGrid() {

    //pixel size of grid
    var width = this.gridPixelWidth - 1;
    var height = this.gridPixelHeight - 1;

    //set the context for drawing
    var context = this.context;

    //draw background
    context.moveTo(0,0);
    context.rect(0,0,this.gridPixelWidth,this.gridPixelHeight);
    context.fillStyle = "green";
    context.fill();

    //create the vertical lines for grid
    for (var x = 0; x <= width; x += this.cellPixelWidth) {
      context.moveTo(0.5 + x, 0);
      context.lineTo(0.5 + x, height);
    }

    // create the horizontal lines for grid
    for (var y = 0; y <= height; y += this.cellPixelHeight) {
      context.moveTo(0, 0.5 + y);
      context.lineTo(width, 0.5 + y);
    }

    //fills in the corner pixel
    context.moveTo(this.gridPixelWidth-1,this.gridPixelHeight-1);
    context.lineTo(this.gridPixelWidth,this.gridPixelHeight);

    //draw lines
    context.strokeStyle = "black";
    context.stroke();
  }

  //draw over the grid square according to selected tool
  private updateCellGraphics(x: number,y: number){
    let xcoord = (this.cellPixelWidth * (x));
    let ycoord = (this.cellPixelHeight * (y));

    let context = this.context;

    context.beginPath();
    context.rect(xcoord+3,ycoord+3,this.cellPixelWidth-5,this.cellPixelHeight-5);

    //this needs to be pulled from server
    if(this.getValue(x,y) == null)
      context.fillStyle = "green";
    else
      context.fillStyle = this.getValue(x,y);


    context.fill();
  }

  //updates the graphics for the entire grid
  private updateGridGraphics(){
    for(let x = 0; x < this.gridCellWidth; x++){
      for(let y = 0; y < this.gridCellHeight; y++){
        this.updateCellGraphics(x,y);
      }
    }
  }

  //this is called by mouseclicks on the grid canvas, and calculates which block needs to be updated
  private onClick(event){

    var rect = event.target.getBoundingClientRect();
    //this gross formula converts mouse coordinates to grid location
    let x = (-1* Math.ceil((rect.left - event.pageX + this.padding)/this.cellPixelWidth));
    let y = (-1 * Math.ceil((rect.top - event.pageY + this.padding)/this.cellPixelHeight));

    this.sendMove(x,y);
  }

  private endGame(winner: string){
    switch(winner){
      case "white":
        setTimeout(()=>{
          alert("Black: " + this.blackScore + "\nWhite: " + this.whiteScore + "\n\n Black wins!");
        }, 250);
        break;
      case "black":
        setTimeout(()=>{
          alert("Black: " + this.blackScore + "\nWhite: " + this.whiteScore + "\n\n White wins!");
        }, 250);
        break;
      case "tie":
        setTimeout(()=>{
          alert("Black: " + this.blackScore + "\nWhite: " + this.whiteScore + "\n\n It's a tie!");
        }, 250);
        break;
    }
  }

  private sendMove(x: number, y: number){
    this.socket.emit("move", {x,y});
  }

  private parseSeverData(data: any){
    this.blackScore = data.blackScore;
    this.whiteScore = data.whiteScore;
    this.turn = data.turn;
    this.grid = data.grid;
  }

  //returns value of selected grid coordinate
  public getValue(x: number, y: number){
    return this.grid[x][y];
  }

  private reset(){
    this.socket.emit("reset");
  }
  
  private opponent(){
    if(this.turn != "white")
      return "black";
    return "white";
  }
}
