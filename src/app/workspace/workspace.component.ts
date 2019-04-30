import { Component, Input, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { ToolSelectorService } from '../tool-selector.service';
import { GridLogicService } from '../grid-logic.service';

@Component({
  selector: 'app-workspace',
  template: '<canvas #canvas (click)="onClick($event)" (dblclick)="onDoubleClick($event)"></canvas>',
  providers: [GridLogicService]
})
export class WorkspaceComponent implements AfterViewInit {

  @ViewChild('canvas') public canvas: ElementRef;

  //divide these values by 30 to get the size of the grid in blocks
  @Input() public width: number = 901;
  @Input() public height: number = 601;

  private context: CanvasRenderingContext2D;

  constructor(private toolSelector: ToolSelectorService, private gridLogic: GridLogicService) { }

  //Once the view initializes, create the workspace grid
  public ngAfterViewInit() {
    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    this.context = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.createGrid();
  }

  //this method creates the grid
  private createGrid() {

    //pixel size of grid
    var width = this.width - 1;
    var height = this.height - 1;

    //set the context for drawing
    var context = this.context;

    //create the vertical lines for grid
    for (var x = 0; x <= width; x += 30) {
      context.moveTo(0.5 + x, 0);
      context.lineTo(0.5 + x, height);
    }

    // create the horizontal lines for grid
    for (var y = 0; y <= height; y += 30) {
      context.moveTo(0, 0.5 + y);
      context.lineTo(width, 0.5 + y);
    }

    //fills in the corner pixel
    context.moveTo(this.width-1,this.height-1);
    context.lineTo(this.width,this.height);

    //draw lines
    context.strokeStyle = "black";
    context.stroke();
  }

  //this is called by mouseclicks on the grid canvas, and calculates which block needs to be updated
  private onClick(event){

    var rect = event.target.getBoundingClientRect();
    //this gross formula converts mouse coordinates to grid location
    let x = (-1* Math.ceil((rect.left - event.pageX)/30) +1);
    let y = (-1 * Math.ceil((rect.top - event.pageY)/30) +1);

    //this passes the coordinate to the function that draws; defaults to redstone
    this.updateBlockGraphics(x,y);
    
    //this passes the changes to the logic handler
    this.gridLogic.updateGrid(x,y,this.toolSelector.getTool())
  }


  private onDoubleClick(event){

    var rect = event.target.getBoundingClientRect();
    //this gross formula converts mouse coordinates to grid location
    let x = (-1* Math.ceil((rect.left - event.pageX)/30) +1);
    let y = (-1 * Math.ceil((rect.top - event.pageY)/30) +1);

    console.log(x + "," + y);

    this.gridLogic.updateGrid(x,y,"empty");
    this.clearBlockGraphics(x,y);
  }

  //draw over the grid square according to selected tool
  private updateBlockGraphics(x: number,y: number): void{
    let xcoord = (30 * (x - 1));
    let ycoord = (30 * (y - 1));

    let context = this.context;

    context.beginPath();
    context.rect(xcoord+1,ycoord+1,29,29);
    context.fillStyle = this.toolSelector.getTool();
    context.fill();
  }

  //redraw white over the grid square
  private clearBlockGraphics(x: number,y: number): void{
    let xcoord = (30 * (x - 1));
    let ycoord = (30 * (y - 1));

    let context = this.context;

    context.beginPath();
    context.rect(xcoord+1,ycoord+1,29,29);
    context.fillStyle = "white";
    context.fill();
  }
}
