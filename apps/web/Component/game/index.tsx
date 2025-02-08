
type shape = {
    type:"rectriangle",
    x:number;
    y:number;
    width:number;
    height:number;
} | {
    type:"circle",
    x:number;
    y:number;
    radius:number;
}

const existingShape: shape[] = [];

function initDraw(canvas:HTMLCanvasElement) {
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    
    if(!ctx)return;
    ctx.strokeStyle = "#ffffff";  
    
    
    let clicked = false
    let startX = 0
    let startY = 0


    canvas.addEventListener("mousedown",(e)=>{
      clicked= true;
      startX = e.clientX
      startY = e.clientY
    })
    
    canvas.addEventListener("mouseup",(e)=>{
      clicked = false;
      const width = e.clientX - startX;
      const height = e.clientY - startY;
      existingShape.push({
        type:"rectriangle",
        x:startX,
        y:startY,
        height,
        width
      })
      
    })
    
    canvas.addEventListener("mousemove",(e)=>{
      if(clicked){
        const width = e.clientX - startX;
        const height = e.clientY - startY;

        clearRender(canvas,ctx)
        ctx.strokeRect(startX,startY,width,height)
      }
    })
}

export default initDraw

function clearRender(canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    existingShape.map((shape)=>{
        if(shape.type == "rectriangle"){
            ctx.strokeRect(shape.x,shape.y,shape.width,shape.height)
        }
    })
}