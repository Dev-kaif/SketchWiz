"use client";

import { useEffect, useRef, useState } from "react";
import initDraw from "../../../Component/game";

// Define available drawing modes
type DrawingMode = "rect" | "circle" | "line" | "triangle" | "freehand" | "text" | null;

const Page = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<DrawingMode>(null);
  const [mode, setMode] = useState<DrawingMode>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle window resize
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateDimensions = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };

      updateDimensions(); // Set initial dimensions
      window.addEventListener("resize", updateDimensions);

      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  // Sync mode state with modeRef
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Initialize canvas when dimensions are set
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && dimensions) {
      initDraw(canvas, modeRef);
    }
  }, [dimensions]);

  if (!dimensions) return null; // Prevent rendering until dimensions are available

  return (
    <div className="text-white">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0 bg-black"
      />

      {/* Drawing Mode Buttons */}
      <div  className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex space-x-2 p-4 bg-zinc-800 rounded-full">
        {["rect", "circle", "line", "triangle", "freehand", "text"].map((shape) => (
          <button
            key={shape}
            className={`bg-zinc-500 px-4 py-2 rounded-full cursor-pointer ${
              mode === shape ? "bg-zinc-600" : ""
            }`}
            onClick={() => setMode(shape as DrawingMode)}
          >
            {shape.charAt(0).toUpperCase() + shape.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Page;
