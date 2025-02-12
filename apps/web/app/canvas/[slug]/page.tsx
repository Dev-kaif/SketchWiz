"use client";

import { useEffect, useRef, useState } from "react";
import initDraw from "../../../Component/game";
import {
  Circle,
  Eraser,
  Minus,
  MoveRight,
  Pencil,
  RectangleHorizontal,
  Triangle,
  TypeOutline,
  Settings as SettingsIcon,
  Trash,
  LogOut,
} from "lucide-react";
import useSocket from "../../../Component/socket/useSocket";
import axios from 'axios';
import { BACKEND_URL } from "../../../Component/Config";
import { useNotification } from "../../../Component/notification";
import { useRouter } from "next/navigation";

// Define available drawing modes
type DrawingMode =
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "freehand"
  | "text"
  | "eraser"
  | "arrow"
  | null;

interface Param {
  params: {
    slug: string;
  };
}

const Page = ({ params }: Param) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<DrawingMode>(null);
  const [mode, setMode] = useState<DrawingMode>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [callDelete ,setCallDelete] = useState(false);
  const { addNotification } = useNotification();
  // Stroke settings (default: white & 3)
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Refs to hold dynamic stroke settings so they’re used in drawing operations.
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const router = useRouter();
  const socket = useSocket();

  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  // State to toggle the settings panel.
  const [showSettings, setShowSettings] = useState(false);

  // Define the eraser size (in pixels)
  const eraserSize = strokeWidth * 10;

  // Handle window resize and set canvas dimensions.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateDimensions = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  // Sync mode state with modeRef.
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Use a ref to store the cleanup function returned by initDraw.
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  // Initialize canvas (and attach event listeners) when dimensions are available.
  useEffect(() => {
    const canvas = canvasRef.current;
    let cancelled = false;
    if (canvas && dimensions) {
      (async () => {
        if(!socket)return;
        // Await initDraw and get its cleanup function.
        const cleanup = await initDraw(
          canvas,
          modeRef,
          strokeColorRef,
          strokeWidthRef,
          socket,
          params // pass params directly
        );
        if (!cancelled) {
          cleanupRef.current = cleanup;
        } else {
          // If the effect has already been cleaned up, run cleanup immediately.
          cleanup();
        }
      })();
    }
    return () => {
      cancelled = true;
      // When the effect cleans up, run the stored cleanup function.
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, [dimensions, eraserSize, params, callDelete, socket]);

  // Update the eraser cursor position.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mode === "eraser" && eraserCursorRef.current) {
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

  if (!dimensions) return null;

  // Basic color swatches for quick selection.
  const basicColors = ["#ffffff", "#ff4d4d", "#4dff4d", "#4d9fff", "#ffeb3b", "#ff66ff", "#00e5ff"];

  async function deleteAllContent() {
    try {
      const slug = (await params).slug;
      const res = await axios.get(`${BACKEND_URL}/api/room/slug/${slug}`);
      const roomId = res.data.room.id;
      const delResponse = await axios.delete(`${BACKEND_URL}/api/room/delete/content/${roomId}`);
      addNotification("success",delResponse.data.message);
    } catch (error:any) {
      addNotification("error",error.response?.data?.message || "")
    }finally{
      setCallDelete(prev=>!prev)
    }
  }

  return (
    <div className="relative">
      {/* Toggle Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute z-50 top-4 left-4 p-2 rounded-full bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors duration-200"
      >
        <SettingsIcon size={24} />
      </button>
      <button
        onClick={() => deleteAllContent()}
        className="absolute z-50 top-4 right-20 p-2 rounded-full bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors duration-200"
      >
        <Trash size={24} />
      </button>
      <button
        onClick={() => router.push('/Dashboard')}
        className="absolute z-50 top-4 right-6 p-2 rounded-full bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors duration-200"
      >
        <LogOut size={24} />
      </button>

      {/* Dynamic Settings Panel */}
      {showSettings && (
        <div className="absolute z-50 top-16 left-4 w-60 p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-white">
          <h2 className="mb-4 text-xl font-bold">Stroke Settings</h2>
          <div className="mb-4">
            <label htmlFor="strokeWidth" className="block text-sm mb-1">
              Stroke Width: {strokeWidth}px
            </label>
            <input
              type="range"
              id="strokeWidth"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          {mode !== "eraser" && (
            <div>
              <div className="mb-4">
                <label htmlFor="strokeColor" className="block text-sm mb-1">
                  Choose Color:
                </label>
                <input
                  type="color"
                  id="strokeColor"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-full h-10 p-0 border-none bg-gray-700"
                />
              </div>
              <div>
                <p className="text-sm mb-1">Basic Colors:</p>
                <div className="flex space-x-2">
                  {basicColors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setStrokeColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full border border-gray-600 ${
                        strokeColor.toLowerCase() === col.toLowerCase() ? "ring-2 ring-indigo-600" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0 bg-[#1A1614]"
      />
      {/* Eraser Cursor Overlay */}
      <div
        ref={eraserCursorRef}
        style={{
          position: "fixed",
          width: `${eraserSize}px`,
          height: `${eraserSize}px`,
          border: "1px solid white",
          backgroundColor: "white",
          borderRadius: "50%",
          pointerEvents: "none",
          display: "none",
          zIndex: 20,
        }}
      />
      {/* Drawing Mode Toolbar */}
      <div className="absolute z-40 top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 px-4 py-2 bg-gray-900 border border-gray-700 rounded-full shadow-md">
        {[
          { name: "rect", symbol: <RectangleHorizontal /> },
          { name: "circle", symbol: <Circle /> },
          { name: "line", symbol: <Minus /> },
          { name: "arrow", symbol: <MoveRight /> },
          { name: "triangle", symbol: <Triangle /> },
          { name: "freehand", symbol: <Pencil /> },
          { name: "text", symbol: <TypeOutline /> },
          { name: "eraser", symbol: <Eraser /> },
        ].map((shapeObj) => (
          <button
            key={shapeObj.name}
            onClick={() => {
              setShowSettings(true);
              setMode(shapeObj.name as DrawingMode);
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200 
              ${
                mode === shapeObj.name
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white"
              }`}
          >
            {shapeObj.symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Page;
