'use client'

import { useEffect, useRef } from "react"
import initDraw from "../../../Component/game";


function Page() {
  const CanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(()=>{
    const canvas = CanvasRef.current

    if(!canvas)return;
    initDraw(canvas);

  },[CanvasRef])


  return (
    <div className="text-white">
      <canvas className="absolute top-0 left-0 bg-black"        
      ref={CanvasRef}></canvas>
      <div className="absolute bottom-0 right-0">
        <div 
        className="bg-blue-500 px-3 py-1 rounded-full cursor-pointer"
        

        >Rectriangle</div>
        <div>Circle</div>
      </div>
    </div>
  )
}

export default Page
