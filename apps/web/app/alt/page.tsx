import { useEffect, useRef, useState } from "react";

type Shape =
  | {
      type: "rectriangle";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      x: number;
      y: number;
      radius: number;
    };

const existingShape: Shape[] = [];

function initDraw(
  canvas: HTMLCanvasElement,
  modeRef: React.RefObject<{ rect: boolean; circle: boolean }>
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "#ffffff";

  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;

  let isDrawing = false;
  let isPanning = false;
  let startX = 0
  let startY = 0;
  let panStartX = 0
  let panStartY = 0

  function renderAll() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    existingShape.forEach((shape) => {
      if (shape.type === "rectriangle") {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      }
      // You can add circle drawing logic here if needed.
    });
    ctx.restore();
  }

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // Right button for panning.
      isPanning = true;
      panStartX = e.clientX - offsetX;
      panStartY = e.clientY - offsetY;
      return;
    }
    // Left button for drawing.
    isDrawing = true;
    startX = (e.clientX - offsetX) / scale;
    startY = (e.clientY - offsetY) / scale;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
      const currentX = (e.clientX - offsetX) / scale;
      const currentY = (e.clientY - offsetY) / scale;

      renderAll();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      // Use the current mode from the ref.
      if (modeRef.current.rect) {
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      }
      ctx.restore();
    } else if (isPanning) {
      offsetX = e.clientX - panStartX;
      offsetY = e.clientY - panStartY;
      renderAll();
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0 && isDrawing) {
      isDrawing = false;
      const endX = (e.clientX - offsetX) / scale;
      const endY = (e.clientY - offsetY) / scale;
      if (modeRef.current.rect) {
        const width = endX - startX;
        const height = endY - startY;
        existingShape.push({
          type: "rectriangle",
          x: startX,
          y: startY,
          width,
          height,
        });
        renderAll();
      }
    } else if (e.button === 2 && isPanning) {
      isPanning = false;
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (isDrawing || isPanning) {
      isDrawing = false;
      isPanning = false;
      renderAll();
    }
  });

  const minScale = 0.4;
  const maxScale = 1;
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.001;
    let newScale = scale - e.deltaY * zoomIntensity;
    newScale = Math.max(newScale, minScale);
    newScale = Math.min(newScale, maxScale);
    const rectBounds = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rectBounds.left;
    const mouseY = e.clientY - rectBounds.top;
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;
    offsetX = mouseX - worldX * newScale;
    offsetY = mouseY - worldY * newScale;
    scale = newScale;
    renderAll();
  });

  renderAll();
}

function Page() {
  const CanvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef({ rect: false, circle: false });
  const [rect, setRect] = useState(false);
  const [circle, setCircle] = useState(false);

  function setAllFalse() {
    setRect(false);
    setCircle(false);
    modeRef.current = { rect: false, circle: false };
  }

  useEffect(() => {
    // Update our ref with the latest mode values.
    modeRef.current = { rect, circle };
  }, [rect, circle]);

  useEffect(() => {
    const canvas = CanvasRef.current;
    if (!canvas) return;
    initDraw(canvas, modeRef);
    // If needed, you can add a cleanup function to remove event listeners.
  }, [CanvasRef]);

  return (
    <div className="text-white">
      <canvas
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute top-0 left-0 bg-black"
        ref={CanvasRef}
      ></canvas>
      <div className="absolute bottom-0 right-0">
        <div
          className="bg-blue-500 px-3 py-1 rounded-full cursor-pointer"
          onClick={() => {
            setAllFalse();
            setRect(true);
          }}
        >
          Rectriangle
        </div>
        <div
          className="bg-blue-500 px-3 py-1 rounded-full cursor-pointer"
          onClick={() => {
            setAllFalse();
            setCircle(true);
          }}
        >
          Circle
        </div>
      </div>
    </div>
  );
}

export default Page;
