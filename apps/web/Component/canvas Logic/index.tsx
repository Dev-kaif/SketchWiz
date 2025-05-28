/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import axios from "../axios/index";
import { BACKEND_URL } from "../Config";

type Point = { x: number; y: number };

export type Shape =
  | {
      id: string;
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "triangle";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x3: number;
      y3: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "freehand";
      points: Point[];
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      content: string;
      strokeColor: string;
      strokeWidth: number;
    }
  | { id: string; type: "eraser"; points: Point[]; size: number }
  | {
      id: string;
      type: "arrow";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      src: string;
    };

interface DrawState {
  shapes: Shape[];
  offsetX: number;
  offsetY: number;
  scale: number;
  isDrawing: boolean;
  isPanning: boolean;
  isFreehandDrawing: boolean;
  isErasing: boolean;
  startX: number;
  startY: number;
  panStartX: number;
  panStartY: number;
  freehandPoints: Point[];
  eraserPoints: Point[];
  currentX?: number;
  currentY?: number;
  textPreview?: {
    x: number;
    y: number;
    text: string;
    showCursor: boolean;
  };
  selectedShapeIds: string[];
  isMarqueeSelecting: boolean; // NEW
  marqueeStartX: number; // NEW
  marqueeStartY: number; // NEW
  marqueeCurrentX: number; // NEW
  marqueeCurrentY: number;
}

// A module-level variable to hold the cleanup function for text input.
let activeTextCleanup: (() => void) | null = null;

interface InitDrawControls {
  cleanup: () => void;
  addShapeLocally: (shape: Shape) => void;
  isCanvasEmpty: () => boolean;
  getSelectedShapesInfo: () => Array<{
    shape: Shape;
    index: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  deleteShapeById: (id: string) => void;
  captureSelectedAreaBlob: () => Promise<Blob | null>;
}

export default async function initDraw(
  canvas: HTMLCanvasElement,
  modeRef: React.RefObject<
    | "rect"
    | "circle"
    | "line"
    | "triangle"
    | "freehand"
    | "text"
    | "eraser"
    | "arrow"
    | "select"
    | null
  >,
  strokeColorRef: React.RefObject<string>,
  strokeWidthRef: React.RefObject<number>,
  socket: WebSocket,
  params: Promise<{ slug: string }>,
  setAiResponse: (a: string) => void
): Promise<InitDrawControls> {
  const defaultState: DrawState = {
    shapes: [],
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isDrawing: false,
    isPanning: false,
    isFreehandDrawing: false,
    isErasing: false,
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0,
    freehandPoints: [],
    eraserPoints: [],
    currentX: undefined,
    currentY: undefined,
    textPreview: undefined,
    selectedShapeIds: [],
    isMarqueeSelecting: false, // NEW
    marqueeStartX: 0, // NEW
    marqueeStartY: 0, // NEW
    marqueeCurrentX: 0, // NEW
    marqueeCurrentY: 0,
  };
  const ctx = canvas.getContext("2d");

  // ADDED: Handle case where canvas context might not be available
  if (!ctx) {
    console.error("Canvas context is not available.");
    // Return a dummy object with no-op functions if context is null
    return {
      cleanup: () => {},
      addShapeLocally: () => {},
      isCanvasEmpty: () => true,
      getSelectedShapesInfo: () => [],
      deleteShapeById: () => {},
      captureSelectedAreaBlob: () => Promise.resolve(null)
    };
  }

  // Consolidate all drawing variables in state.
  const state: DrawState = { ...defaultState };

  // Schedule rendering with requestAnimationFrame.
  let renderRequested = false;
  function scheduleRender() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(() => {
        renderRequested = false;
        renderAll();
      });
    }
  }

  // Add this new helper function inside initDraw, after `state` is defined
  function addShapeLocally(shape: Shape) {
    state.shapes.push(shape);
    scheduleRender(); // Request a re-render to display the new shape
  }

  function isCanvasEmpty(): boolean {
    return state.shapes.length === 0;
  }

  const imageCache: { [src: string]: HTMLImageElement } = {};

  function getShapeBounds(
    ctx: CanvasRenderingContext2D,
    shape: Shape
  ): { x: number; y: number; width: number; height: number } | null {
    // Note: Text and Freehand bounds are approximations.
    // For precise text bounds, you might need to render to a temp canvas and measure.
    switch (shape.type) {
      case "rectangle":
        return {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        };
      case "circle":
        return {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        };
      case "line":
      case "arrow":
        const minX = Math.min(shape.x1, shape.x2);
        const maxX = Math.max(shape.x1, shape.x2);
        const minY = Math.min(shape.y1, shape.y2);
        const maxY = Math.max(shape.y1, shape.y2);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      case "triangle":
        const triMinX = Math.min(shape.x1, shape.x2, shape.x3);
        const triMaxX = Math.max(shape.x1, shape.x2, shape.x3);
        const triMinY = Math.min(shape.y1, shape.y2, shape.y3);
        const triMaxY = Math.max(shape.y1, shape.y2, shape.y3);
        return {
          x: triMinX,
          y: triMinY,
          width: triMaxX - triMinX,
          height: triMaxY - triMinY,
        };
      case "freehand":
      case "eraser":
        if (shape.points.length === 0) return null;
        let minFreeX = Infinity,
          maxFreeX = -Infinity,
          minFreeY = Infinity,
          maxFreeY = -Infinity;
        shape.points.forEach((p) => {
          minFreeX = Math.min(minFreeX, p.x);
          maxFreeX = Math.max(maxFreeX, p.x);
          minFreeY = Math.min(minFreeY, p.y);
          maxFreeY = Math.max(maxFreeY, p.y);
        });
        // Add padding for line width/eraser size
        const padding =
          (shape.type === "freehand" ? shape.strokeWidth : shape.size) / 2 + 2; // +2 for extra buffer
        return {
          x: minFreeX - padding,
          y: minFreeY - padding,
          width: maxFreeX - minFreeX + padding * 2,
          height: maxFreeY - minFreeY + padding * 2,
        };
      case "text":
        const fontSize = shape.strokeWidth * 10;
        const lines = shape.content.split("\n");
        // Rough estimate for text width - get max width of lines
        let maxTextWidth = 0;
        // ctx is guaranteed to be non-null here
        lines.forEach((line) => {
          maxTextWidth = Math.max(maxTextWidth, ctx.measureText(line).width);
        });
        const textHeight = lines.length * fontSize * 1.2; // 1.2 for line spacing
        return {
          x: shape.x,
          y: shape.y - fontSize * 0.8,
          width: maxTextWidth,
          height: textHeight,
        }; // Adjust y to be closer to top of text
      case "image":
        return {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        };
      default:
        // ADDED: Default case to ensure all Shape types are handled
        // If a new shape type is added and not handled, this prevents a potential error
        return null;
    }
  }

  function getSelectedShapesInfo(): Array<{
    shape: Shape;
    index: number;
    bounds: { x: number; y: number; width: number; height: number };
  }> {
    const infos: Array<{
      shape: Shape;
      index: number;
      bounds: { x: number; y: number; width: number; height: number };
    }> = [];
    state.selectedShapeIds.forEach((id) => {
      const index = state.shapes.findIndex((s) => s.id === id);
      if (index !== -1) {
        const selectedShape = state.shapes[index];
        if (ctx && selectedShape) {
          const bounds = getShapeBounds(ctx, selectedShape);
          if (bounds) {
            infos.push({ shape: selectedShape, index: index, bounds: bounds });
          }
        }
      }
    });
    return infos;
  }

  function deleteShapeById(id: string) {
    const index = state.shapes.findIndex((s) => s.id === id);
    if (index !== -1) {
      state.shapes.splice(index, 1);
      // If the deleted shape was selected, clear selection or adjust index
      state.selectedShapeIds = state.selectedShapeIds.filter(
        (selectedId) => selectedId !== id
      );
      scheduleRender();
    }
  }


  // Add this function inside initDraw, near getSelectedShapesInfo
function captureSelectedAreaBlob(): Promise<Blob | null> {
  return new Promise(resolve => {
      if (!ctx || state.selectedShapeIds.length === 0) {
          resolve(null);
          return;
      }

      // 1. Calculate combined bounding box of all selected shapes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const selectedShapes: Shape[] = [];

      state.selectedShapeIds.forEach(id => {
          const shape = state.shapes.find(s => s.id === id);
          if (shape) {
              const bounds = getShapeBounds(ctx, shape);
              if (bounds) {
                  minX = Math.min(minX, bounds.x);
                  minY = Math.min(minY, bounds.y);
                  maxX = Math.max(maxX, bounds.x + bounds.width);
                  maxY = Math.max(maxY, bounds.y + bounds.height);
                  selectedShapes.push(shape); // Collect selected shapes for drawing
              }
          }
      });

      if (selectedShapes.length === 0) { // No valid selected shapes found
          resolve(null);
          return;
      }

      const combinedBounds = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
      };

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
          resolve(null);
          return;
      }

      const padding = 10; // Add some padding around the captured area
      tempCanvas.width = combinedBounds.width + 2 * padding;
      tempCanvas.height = combinedBounds.height + 2 * padding;

      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.save();

      // Translate the temporary context so that the combinedBounds's top-left
      // corner is at (padding, padding) on the tempCanvas.
      tempCtx.translate(-combinedBounds.x + padding, -combinedBounds.y + padding);

      // 2. Draw ONLY the selected shapes onto the temporary canvas
      selectedShapes.forEach(shape => {
          const drawFn = (drawShape as any)[shape.type];
          if (drawFn) {
              // Ensure temporary canvas uses the same scaling logic if any within drawShape
              tempCtx.save();
              tempCtx.lineJoin = "round";
              tempCtx.lineCap = "round";
              tempCtx.shadowBlur = 2; // Match original drawing style
              drawFn(tempCtx, shape);
              tempCtx.restore();
          }
      });

      tempCtx.restore();

      tempCanvas.toBlob(blob => {
          resolve(blob);
          tempCanvas.remove(); // Clean up temp canvas
      }, 'image/png');
  });
}

  // --------------------------------------------------
  // Drawing Helper Functions for Permanent Shapes
  // --------------------------------------------------
  const drawShape = {
    rectangle: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "rectangle" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    },
    circle: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "circle" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.beginPath();
      ctx.ellipse(
        shape.x,
        shape.y,
        shape.radiusX,
        shape.radiusY,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    },
    line: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "line" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
    },
    triangle: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "triangle" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.lineTo(shape.x3, shape.y3);
      ctx.closePath();
      ctx.stroke();
    },
    freehand: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "freehand" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.beginPath();
      // ADDED: Nullish coalescing for safety if points array is unexpectedly empty
      ctx.moveTo(shape.points[0]?.x ?? 0, shape.points[0]?.y ?? 0);
      shape.points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    },
    // For text, split on "\n" and draw each line.
    text: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "text" }>
    ) => {
      const lines = shape.content.split("\n");
      const fontSize = shape.strokeWidth * 10;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = shape.strokeColor;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i] as string, shape.x, shape.y + i * fontSize * 1.2);
      }
    },
    eraser: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "eraser" }>
    ) => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = shape.size;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      // ADDED: Nullish coalescing for safety if points array is unexpectedly empty
      ctx.moveTo(shape.points[0]?.x ?? 0, shape.points[0]?.y ?? 0);
      shape.points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    },
    arrow: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "arrow" }>
    ) => {
      ctx.shadowColor = shape.strokeColor;
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();

      const dx = shape.x2 - shape.x1;
      const dy = shape.y2 - shape.y1;
      const angle = Math.atan2(dy, dx);
      const headLength = Math.max(10, shape.strokeWidth * 5);
      ctx.beginPath();
      ctx.moveTo(shape.x2, shape.y2);
      ctx.lineTo(
        shape.x2 - headLength * Math.cos(angle - Math.PI / 7),
        shape.y2 - headLength * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        shape.x2 - headLength * Math.cos(angle + Math.PI / 7),
        shape.y2 - headLength * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fillStyle = shape.strokeColor;
      ctx.fill();
    },
    image: (
      ctx: CanvasRenderingContext2D,
      shape: Extract<Shape, { type: "image" }>
    ) => {
      let img = imageCache[shape.src];
      if (!img) {
        img = new Image();
        img.crossOrigin = "anonymous"; // Important for CORS if images are from external sources
        img.onload = () => {
          // Re-render only after image is loaded to display it
          scheduleRender();
        };
        img.onerror = (err) => {
          console.error("Failed to load image for drawing:", shape.src, err);
          // You might want to draw a placeholder or log an error
        };
        img.src = shape.src;
        imageCache[shape.src] = img; // Cache the image for future use
      }

      // Draw only if the image is loaded and ready
      if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, shape.x, shape.y, shape.width, shape.height);
      }
    },
  };

  // --------------------------------------------------
  // Render Function: Draw Permanent Shapes & Previews
  // --------------------------------------------------
  function renderAll() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.scale, state.scale);

    // 1. Draw saved shapes.
    state.shapes.forEach((shape) => {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowBlur = 2;
      const drawFn = (drawShape as any)[shape.type];
      if (drawFn) {
        drawFn(ctx, shape);
      }
      ctx.restore();
    });

    state.selectedShapeIds.forEach((selectedId) => {
      const selectedShape = state.shapes.find((s) => s.id === selectedId);
      if (selectedShape) {
        const bounds = getShapeBounds(ctx, selectedShape);
        if (bounds) {
          ctx.save();
          ctx.strokeStyle = "#00aaff"; // Highlight color
          ctx.lineWidth = 2 / state.scale; // Make sure line width scales inversely with zoom
          ctx.setLineDash([5, 5]); // Dashed line
          ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.restore();
        }
      }
    });

    // NEW: Draw marquee selection rectangle
    if (
      state.isMarqueeSelecting &&
      state.marqueeCurrentX !== undefined &&
      state.marqueeCurrentY !== undefined
    ) {
      ctx.save();
      ctx.strokeStyle = "#00aaff"; // Marquee color
      ctx.lineWidth = 1 / state.scale; // Thin line
      ctx.setLineDash([2, 2]); // Dashed line
      const x = Math.min(state.marqueeStartX, state.marqueeCurrentX);
      const y = Math.min(state.marqueeStartY, state.marqueeCurrentY);
      const width = Math.abs(state.marqueeCurrentX - state.marqueeStartX);
      const height = Math.abs(state.marqueeCurrentY - state.marqueeStartY);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    }

    // 2. Preview for regular shapes (rect, circle, line, triangle, arrow).
    if (
      state.isDrawing &&
      state.currentX !== undefined &&
      state.currentY !== undefined // Ensure currentX/Y are defined for preview
    ) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = strokeColorRef.current;
      ctx.strokeStyle = strokeColorRef.current;
      ctx.lineWidth = strokeWidthRef.current;
      const startX = state.startX;
      const startY = state.startY;
      const currentX = state.currentX;
      const currentY = state.currentY;
      if (modeRef.current === "rect") {
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      } else if (modeRef.current === "circle") {
        const centerX = (startX + currentX) / 2;
        const centerY = (startY + currentY) / 2;
        const radiusX = Math.abs(currentX - startX) / 2;
        const radiusY = Math.abs(currentY - startY) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (modeRef.current === "line" || modeRef.current === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      } else if (modeRef.current === "triangle") {
        const dx = currentX - startX;
        const dy = currentY - startY;
        const midX = (startX + currentX) / 2;
        const midY = (startY + currentY) / 2;
        // This calculates a point for an equilateral triangle.
        // For a more general triangle, it might need to use other points.
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY + dx * (Math.sqrt(3) / 2); // Corrected `+ dx` for rotation
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.lineTo(thirdX, thirdY);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Preview for freehand pencil.
    if (state.isFreehandDrawing && state.freehandPoints.length > 0) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = strokeColorRef.current;
      ctx.strokeStyle = strokeColorRef.current;
      ctx.lineWidth = strokeWidthRef.current;
      ctx.beginPath();
      // ADDED: Nullish coalescing for safety if points array is unexpectedly empty
      ctx.moveTo(
        state.freehandPoints[0]?.x ?? 0,
        state.freehandPoints[0]?.y ?? 0
      );
      state.freehandPoints.forEach((pt, i) => {
        if (i > 0) ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 4. Preview for eraser.
    if (state.isErasing && state.eraserPoints.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = strokeWidthRef.current * 10;
      ctx.beginPath();
      // ADDED: Nullish coalescing for safety if points array is unexpectedly empty
      ctx.moveTo(state.eraserPoints[0]?.x ?? 0, state.eraserPoints[0]?.y ?? 0);
      state.eraserPoints.forEach((pt, i) => {
        if (i > 0) ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 5. Preview for text (multiline).
    if (state.textPreview) {
      ctx.save();
      const fontSize = strokeWidthRef.current * 10;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = strokeColorRef.current;
      const displayText = state.textPreview.showCursor
        ? state.textPreview.text + "|"
        : state.textPreview.text;
      const lines = displayText.split("\n");
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(
          lines[i] as string,
          state.textPreview.x,
          state.textPreview.y + i * fontSize * 1.2
        );
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // --------------------------------------------------
  // Load Previous Shapes and Setup Socket
  // --------------------------------------------------
  async function loadPreviousShapes() {
    const slug = (await params).slug;
    const roomIdRes = await axios.get(`${BACKEND_URL}/api/room/slug/${slug}`);
    const roomId = roomIdRes.data.room.id;
    // Join the room via socket.
    socket.send(JSON.stringify({ type: "join_room", roomId }));
    const res = await axios.get(`${BACKEND_URL}/api/room/${roomId}`);
    const messages = res.data.messages;
    messages.forEach((msg: { id: number; message: string }) => {
      // ADDED: Assert message is a Shape for type safety
      state.shapes.push(JSON.parse(msg.message) as Shape);
    });
    return roomId;
  }

  const roomId = await loadPreviousShapes();


  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
  
    if (data.type === "chat" && data.message) {
      const shape = data.message as Shape;
  
      if (shape.type === "image" && shape.src.startsWith("data:image")) {
        state.shapes.push(shape);
      }
  
      state.shapes.push(shape);
      scheduleRender();
    }
  
    if (data.type === "ai") {
      setAiResponse(data.message);
    }
  };

  function sendShapeMessage(shape: Shape) {
    const message = { type: "chat", roomId, message: shape };
    socket.send(JSON.stringify(message));
  }

  // --------------------------------------------------
  // Event Handlers
  // --------------------------------------------------

  // Prevent default context menu.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const clientToWorld = (clientX: number, clientY: number) => ({
    x: (clientX - state.offsetX) / state.scale,
    y: (clientY - state.offsetY) / state.scale,
  });

  //  new chnages 




  function handleMouseDown(e: MouseEvent) {
    // `ctx` is guaranteed non-null here due to the initial check in initDraw
    const { x: worldX, y: worldY } = clientToWorld(e.clientX, e.clientY);
    const isCtrlOrCmdPressed = e.ctrlKey || e.metaKey;
  
    // 1. Handle active text preview (highest priority as it's an overlay)
    if (state.textPreview && modeRef.current === "text") {
      activeTextCleanup?.(); // Finalize current text input
      return;
    }
  
    // 2. Handle right-click for panning (second highest priority)
    if (e.button === 2) {
      state.isPanning = true;
      state.panStartX = e.clientX - state.offsetX;
      state.panStartY = e.clientY - state.offsetY; // FIXED: Corrected this line
      state.selectedShapeIds = []; // Clear selection on pan start
      state.isMarqueeSelecting = false; // Ensure marquee is off
      scheduleRender();
      return;
    }
  
    // 3. Handle interactions based on the current drawing mode (left-click)
    switch (modeRef.current) {
      case "select":
        handleSelectionStart(worldX, worldY, isCtrlOrCmdPressed);
        break;
  
      case "freehand":
      case "eraser":
        startFreehandOrEraser(worldX, worldY, modeRef.current);
        break;
  
      case "text":
        // Text input is handled by double-click, so single click does nothing specific here
        break;
  
      case "rect":
      case "circle":
      case "line":
      case "triangle":
      case "arrow":
        startDrawingMode(worldX, worldY);
        break;
  
      case null: // No mode selected, potentially clear selection
        state.selectedShapeIds = [];
        state.isMarqueeSelecting = false;
        scheduleRender();
        break;
    }
  }
  
  // Helper for starting selection (single or marquee)
  function handleSelectionStart(worldX: number, worldY: number, isCtrlOrCmdPressed: boolean) {
    if(!ctx)return;
    let clickedShapeId: string | null = null;
    // Iterate backwards to find the topmost shape that was clicked
    for (let i = state.shapes.length - 1; i >= 0; i--) {
      const shape = state.shapes[i];
      if (shape) { // Type guard for safety
        const bounds = getShapeBounds(ctx, shape); 
        if (
          bounds &&
          worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
          worldY >= bounds.y && worldY <= bounds.y + bounds.height
        ) {
          clickedShapeId = shape.id;
          break;
        }
      }
    }
  
    if (clickedShapeId) {
      const isAlreadySelected = state.selectedShapeIds.includes(clickedShapeId);
      if (isCtrlOrCmdPressed) {
        // Toggle selection for individual shape
        state.selectedShapeIds = isAlreadySelected
          ? state.selectedShapeIds.filter((id) => id !== clickedShapeId)
          : [...state.selectedShapeIds, clickedShapeId];
      } else {
        // Single select: clear all and select only this one
        state.selectedShapeIds = [clickedShapeId];
      }
      state.isMarqueeSelecting = false; // Ensure marquee is off
    } else {
      // No shape clicked, start marquee selection
      state.isMarqueeSelecting = true;
      state.marqueeStartX = worldX;
      state.marqueeStartY = worldY;
      state.marqueeCurrentX = worldX;
      state.marqueeCurrentY = worldY;
      if (!isCtrlOrCmdPressed) {
        state.selectedShapeIds = []; // Clear existing selection if not multi-selecting
      }
    }
    scheduleRender();
  }
  
  // Helper for starting freehand or eraser drawing
  function startFreehandOrEraser(worldX: number, worldY: number, mode: "freehand" | "eraser") {
    state.selectedShapeIds = []; // Clear selection when starting a new drawing
    state.isMarqueeSelecting = false; // Ensure marquee is off
    const points = [{ x: worldX, y: worldY }];
    if (mode === "eraser") {
      state.isErasing = true;
      state.eraserPoints = points;
    } else { // freehand
      state.isFreehandDrawing = true;
      state.freehandPoints = points;
    }
    scheduleRender();
  }
  
  // Helper for starting a new shape drawing
  function startDrawingMode(worldX: number, worldY: number) {
    state.selectedShapeIds = []; // Clear selection when starting a new drawing
    state.isMarqueeSelecting = false; // Ensure marquee is off
    state.isDrawing = true;
    state.startX = worldX;
    state.startY = worldY;
    state.currentX = worldX;
    state.currentY = worldY;
    scheduleRender();
  }
  
  
  // Mousemove handler.
  function handleMouseMove(e: MouseEvent) {
    const { x: worldX, y: worldY } = clientToWorld(e.clientX, e.clientY);
  
    // Prioritize active drawing/panning states
    if (state.isErasing) {
      state.eraserPoints.push({ x: worldX, y: worldY });
    } else if (state.isFreehandDrawing) {
      state.freehandPoints.push({ x: worldX, y: worldY });
    } else if (state.isDrawing) {
      state.currentX = worldX;
      state.currentY = worldY;
    } else if (state.isPanning) {
      state.offsetX = e.clientX - state.panStartX;
      state.offsetY = e.clientY - state.panStartY;
    } else if (modeRef.current === "select" && state.isMarqueeSelecting) {
      state.marqueeCurrentX = worldX;
      state.marqueeCurrentY = worldY;
    } else {
      // No active drawing/panning/marquee, no need to render
      return;
    }
    scheduleRender(); // Only render if a state change occurred
  }
  
  // Mouseup handler.
  function handleMouseUp(e: MouseEvent) {
    // `ctx` is guaranteed non-null here due to the initial check in initDraw
    const { x: worldX, y: worldY } = clientToWorld(e.clientX, e.clientY);
    const isCtrlOrCmdPressed = e.ctrlKey || e.metaKey;
  
    // 1. Handle right-click for ending panning
    if (e.button === 2 && state.isPanning) {
      state.isPanning = false;
      // No scheduleRender needed here, as mousemove already did it on last pan
      return;
    }
  
    // 2. Handle ending actions based on the current drawing mode
    switch (modeRef.current) {
      case "freehand":
        if (state.isFreehandDrawing) {
          finalizeFreehandDrawing();
        }
        break;
  
      case "eraser":
        if (state.isErasing) {
          finalizeEraserDrawing();
        }
        break;
  
      case "rect":
      case "circle":
      case "line":
      case "triangle":
      case "arrow":
        if (state.isDrawing) {
          finalizeDrawingMode(worldX, worldY);
        }
        break;
  
      case "select":
        if (state.isMarqueeSelecting) {
          endMarqueeSelection(worldX, worldY, isCtrlOrCmdPressed);
        }
        // If it was a single click in select mode (not marquee), no action needed here
        break;
  
      case "text":
      case null:
        // No specific mouseup action for these modes
        break;
    }
  }
  
  // Helper for finalizing freehand drawing
  function finalizeFreehandDrawing() {
    state.isFreehandDrawing = false;
    if (state.freehandPoints.length > 0) { // Only add if points exist
      const newShape: Shape = {
        id: crypto.randomUUID(),
        type: "freehand",
        points: state.freehandPoints,
        strokeColor: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
      };
      state.shapes.push(newShape);
      sendShapeMessage(newShape);
    }
    state.freehandPoints = [];
    scheduleRender();
  }
  
  // Helper for finalizing eraser drawing
  function finalizeEraserDrawing() {
    state.isErasing = false;
    if (state.eraserPoints.length > 0) { // Only add if points exist
      const newShape: Shape = {
        id: crypto.randomUUID(),
        type: "eraser",
        points: state.eraserPoints,
        size: strokeWidthRef.current * 10,
      };
      state.shapes.push(newShape);
      sendShapeMessage(newShape);
    }
    state.eraserPoints = [];
    scheduleRender();
  }
  
  // Helper for finalizing regular shape drawing
  function finalizeDrawingMode(finalX: number, finalY: number) {
    state.isDrawing = false;
    let newShape: Shape | null = null;
  
    switch (modeRef.current) {
      case "rect":
        newShape = {
          id: crypto.randomUUID(),
          type: "rectangle",
          x: state.startX,
          y: state.startY,
          width: finalX - state.startX,
          height: finalY - state.startY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        break;
      case "circle":
        const centerX = (state.startX + finalX) / 2;
        const centerY = (state.startY + finalY) / 2;
        newShape = {
          id: crypto.randomUUID(),
          type: "circle",
          x: centerX,
          y: centerY,
          radiusX: Math.abs(finalX - state.startX) / 2,
          radiusY: Math.abs(finalY - state.startY) / 2,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        break;
      case "line":
        newShape = {
          id: crypto.randomUUID(),
          type: "line",
          x1: state.startX,
          y1: state.startY,
          x2: finalX,
          y2: finalY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        break;
      case "triangle":
        const dx = finalX - state.startX;
        const dy = finalY - state.startY;
        const midX = (state.startX + finalX) / 2;
        const midY = (state.startY + finalY) / 2;
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY + dx * (Math.sqrt(3) / 2);
        newShape = {
          id: crypto.randomUUID(),
          type: "triangle",
          x1: state.startX,
          y1: state.startY,
          x2: finalX,
          y2: finalY,
          x3: thirdX,
          y3: thirdY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        break;
      case "arrow":
        newShape = {
          id: crypto.randomUUID(),
          type: "arrow",
          x1: state.startX,
          y1: state.startY,
          x2: finalX,
          y2: finalY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        break;
    }
  
    if (newShape) {
      state.shapes.push(newShape);
      sendShapeMessage(newShape);
    }
    state.currentX = undefined;
    state.currentY = undefined;
    scheduleRender();
  }
  
  // Helper for ending marquee selection
  function endMarqueeSelection(worldX: number, worldY: number, isCtrlOrCmdPressed: boolean) {
    if(!ctx)return;
    state.isMarqueeSelecting = false;
  
    const rectX = Math.min(state.marqueeStartX, worldX);
    const rectY = Math.min(state.marqueeStartY, worldY);
    const rectWidth = Math.abs(worldX - state.marqueeStartX);
    const rectHeight = Math.abs(worldY - state.marqueeStartY);
  
    const marqueeBounds = {
      x: rectX,
      y: rectY,
      width: rectWidth,
      height: rectHeight,
    };
  
    // Clear existing selections IF Ctrl/Cmd was NOT pressed (for new marquee selection)
    if (!isCtrlOrCmdPressed) {
      state.selectedShapeIds = [];
    }
  
    // Add shapes that intersect with the marquee selection
    state.shapes.forEach((shape) => {
      const shapeBounds = getShapeBounds(ctx,shape);
      if (shapeBounds) {
        // Check for intersection between marqueeBounds and shapeBounds
        if (
          marqueeBounds.x < shapeBounds.x + shapeBounds.width &&
          marqueeBounds.x + marqueeBounds.width > shapeBounds.x &&
          marqueeBounds.y < shapeBounds.y + shapeBounds.height &&
          marqueeBounds.y + marqueeBounds.height > shapeBounds.y
        ) {
          // Only add if not already selected (important for Ctrl/Cmd mode)
          if (!state.selectedShapeIds.includes(shape.id)) {
            state.selectedShapeIds.push(shape.id);
          }
        }
      }
    });
  
    // Reset marquee coordinates
    state.marqueeStartX = 0;
    state.marqueeStartY = 0;
    state.marqueeCurrentX = 0;
    state.marqueeCurrentY = 0;
  
    scheduleRender(); // Rerender to show new selections
  }
  
  // Wheel (zoom) handler.
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomIntensity = 0.001;
    let newScale = state.scale - e.deltaY * zoomIntensity;
    const minScale = 0.4;
    const maxScale = 1;
    newScale = Math.max(newScale, minScale);
    newScale = Math.min(newScale, maxScale);
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - state.offsetX) / state.scale;
    const worldY = (mouseY - state.offsetY) / state.scale;
    state.offsetX = mouseX - worldX * newScale;
    state.offsetY = mouseY - worldY * newScale;
    state.scale = newScale;
    scheduleRender();
  }

  // --------------------------------------------------
  // Double-click for text input.
  // --------------------------------------------------
  function handleDoubleClick(e: MouseEvent) {
    if (modeRef.current !== "text") return;

    // If a text input session is already active, clean it up first.
    if (activeTextCleanup) {
      activeTextCleanup();
    }

    const worldX = (e.clientX - state.offsetX) / state.scale;
    const worldY = (e.clientY - state.offsetY) / state.scale;
    state.textPreview = { x: worldX, y: worldY, text: "", showCursor: true };
    scheduleRender();

    function updateText(newText: string) {
      if (state.textPreview) {
        state.textPreview.text = newText;
        scheduleRender();
      }
    }

    function toggleCursor() {
      if (state.textPreview) {
        state.textPreview.showCursor = !state.textPreview.showCursor;
        scheduleRender();
      }
    }

    const cursorInterval = setInterval(toggleCursor, 500);

    // pressing Enter inserts a newline.
    function handleKeydown(event: KeyboardEvent) {
      if (!state.textPreview) return;
      if (event.key === "Enter") {
        updateText(state.textPreview.text + "\n");
        event.preventDefault();
      } else if (event.key === "Backspace") {
        updateText(state.textPreview.text.slice(0, -1));
      } else if (event.key.length === 1) {
        // This condition is good for single character keys
        updateText(state.textPreview.text + event.key);
      }
    }

    // This mousedown listener cancels the text input (saving the text) if the user clicks elsewhere.
    function handleTextCancel(e: MouseEvent) {
      cleanup(); // Calls the inner cleanup function
    }

    function cleanup() {
      clearInterval(cursorInterval);
      // Finalize the text if any non-empty content exists.
      if (state.textPreview && state.textPreview.text.trim().length > 0) {
        const newShape: Shape = {
          id: crypto.randomUUID(),
          type: "text",
          x: state.textPreview.x,
          y: state.textPreview.y,
          content: state.textPreview.text,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
        state.shapes.push(newShape);
        sendShapeMessage(newShape);
      }
      state.textPreview = undefined;
      document.removeEventListener("keydown", handleKeydown);
      canvas.removeEventListener("mousedown", handleTextCancel);
      scheduleRender();
      activeTextCleanup = null;
    }

    document.addEventListener("keydown", handleKeydown);
    canvas.addEventListener("mousedown", handleTextCancel);
    activeTextCleanup = cleanup; // Store the cleanup function
  }

  // Register event listeners.
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("wheel", handleWheel);
  canvas.addEventListener("dblclick", handleDoubleClick);

  // Initial render.
  scheduleRender();

  return {
    cleanup: function cleanup() {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      if (activeTextCleanup) {
        activeTextCleanup();
      }
    },
    addShapeLocally: addShapeLocally,
    isCanvasEmpty: isCanvasEmpty,
    getSelectedShapesInfo: getSelectedShapesInfo, 
    deleteShapeById: deleteShapeById,
    captureSelectedAreaBlob: captureSelectedAreaBlob,
  };
}
