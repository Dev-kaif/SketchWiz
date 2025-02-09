"use client";

import { useEffect, useRef, useState } from "react";
import initDraw from "../../../Component/game";

// Define available drawing modes
type DrawingMode =
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "freehand"
  | "text"
  | "eraser"
  | null;

const Page = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<DrawingMode>(null);
  const [mode, setMode] = useState<DrawingMode>(null);
  const [dimensions, setDimensions] = useState<{width: number;height: number;} | null>(null);

  // Define the eraser size (in pixels)
  const eraserSize = 20;

  // Handle window resize and set canvas dimensions.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateDimensions = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };

      updateDimensions(); // Set initial dimensions.
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  // Sync mode state with modeRef.
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Initialize canvas when dimensions are available.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && dimensions) {
      initDraw(canvas, modeRef);
    }
  }, [dimensions]);

  // Update the position (and visibility) of the eraser cursor.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mode === "eraser" && eraserCursorRef.current) {
        // Position the cursor div so it is centered on the mouse.
        eraserCursorRef.current.style.left = `${e.clientX - eraserSize / 2}px`;
        eraserCursorRef.current.style.top = `${e.clientY - eraserSize / 2}px`;
        eraserCursorRef.current.style.display = "block";
      } else if (eraserCursorRef.current) {
        eraserCursorRef.current.style.display = "none";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mode, eraserSize]);

  if (!dimensions) return null; // Prevent rendering until dimensions are available.

  return (
    <div className="text-white relative">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0 bg-black"
      />
      {/* Eraser Cursor Overlay */}
      <div
        ref={eraserCursorRef}
        style={{
          position: "fixed",
          width: `${eraserSize}px`,
          height: `${eraserSize}px`,
          border: "1px solid white",
          backgroundColor:"white",
          borderRadius: "50%",
          pointerEvents: "none",
          display: "none",
          zIndex: 20,
        }}
      />
      {/* Drawing Mode Buttons */}
      <div className="absolute z-40 top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 p-4 bg-zinc-800 rounded-full">
        {[
          "rect",
          "circle",
          "line",
          "triangle",
          "freehand",
          "text",
          "eraser",
        ].map((shape) => (
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
