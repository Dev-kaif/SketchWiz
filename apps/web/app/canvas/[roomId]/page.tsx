'use client'

import { useEffect, useRef, useState } from "react"
import initDraw from "../../../Component/game";

type DrawingMode = "rect" | "circle" | null;


function Page() {
  const CanvasRef = useRef<HTMLCanvasElement>(null);

  // Use a state variable for the drawing mode.
  const [mode, setMode] = useState<DrawingMode>(null);

  // Create a ref that will always hold the current mode.
  const modeRef = useRef<DrawingMode>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(()=>{
    const canvas = CanvasRef.current

    if(!canvas)return;
    initDraw(canvas, modeRef);

  },[CanvasRef])


  return (
    <div className="text-white">
      <canvas width={window.innerWidth} height={window.innerHeight} className="absolute top-0 left-0 bg-black"        
      ref={CanvasRef}></canvas>
      <div className="absolute bottom-0 right-0 z-10">
        <div 
        className="bg-blue-500 px-3 py-1 rounded-full cursor-pointer"
        onClick={()=>{
          setMode("rect")
        }}

        >Rectriangle</div>
        <div
        className="bg-blue-500 px-3 py-1 rounded-full cursor-pointer"
        onClick={()=>{
          setMode("circle")
        }}
        >Circle</div>
      </div>
    </div>
  )
}

export default Page
