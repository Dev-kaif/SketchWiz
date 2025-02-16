import axios from "../axios/index";
import { BACKEND_URL } from "../Config";

type Point = { x: number; y: number };

type Shape =
  | {
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      type: "circle";
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
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
      type: "freehand";
      points: Point[];
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      content: string;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      type: "eraser";
      points: Point[];
      size: number;
    }
  | {
      type: "arrow";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
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
}


// A module-level variable to hold the cleanup function for text input.
let activeTextCleanup: (() => void) | null = null;

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
    | null
  >,
  strokeColorRef: React.RefObject<string>,
  strokeWidthRef: React.RefObject<number>,
  socket: WebSocket,
  params: Promise<{ slug: string }>,
  setAiResponse :(a:string)=>void
): Promise<() => void> {

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
  };
  const ctx = canvas.getContext("2d");

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
    line: (ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: "line" }>) => {
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
      ctx.moveTo(shape.points[0]?.x || 0, shape.points[0]?.y || 0);
      shape.points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    },
    // For text, split on "\n" and draw each line.
    text: (ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: "text" }>) => {
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
      ctx.moveTo(shape.points[0]?.x || 0, shape.points[0]?.y || 0);
      shape.points.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    },
    arrow: (ctx: CanvasRenderingContext2D, shape: Extract<Shape, { type: "arrow" }>) => {
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

    // 2. Preview for regular shapes (rect, circle, line, triangle, arrow).
    if (state.isDrawing && state.currentX !== undefined && state.currentY !== undefined) {
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
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY - dx * (Math.sqrt(3) / 2);
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
      ctx.moveTo(state.freehandPoints[0]?.x || 0, state.freehandPoints[0]?.y || 0);
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
      ctx.moveTo(state.eraserPoints[0]?.x || 0, state.eraserPoints[0]?.y || 0);
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
        ctx.fillText(lines[i] as string, state.textPreview.x, state.textPreview.y + i * fontSize * 1.2);
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
      state.shapes.push(JSON.parse(msg.message));
    });
    return roomId;
  }

  const roomId = await loadPreviousShapes();

  socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "chat" && data.message) {
        state.shapes.push(data.message);
        scheduleRender();
      }
      if(data.type === "ai"){
        setAiResponse(data.message)
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

  // Mousedown handler.
  function handleMouseDown(e: MouseEvent) {
    const worldX = (e.clientX - state.offsetX) / state.scale;
    const worldY = (e.clientY - state.offsetY) / state.scale;

    // If a text preview is active and the user clicks, cancel & finalize text.
    if (state.textPreview && modeRef.current === "text") {
      if (activeTextCleanup) {
        activeTextCleanup();
      }
      return;
    }

    if (e.button === 2) {
      // Right-click for panning.
      state.isPanning = true;
      state.panStartX = e.clientX - state.offsetX;
      state.panStartY = e.clientY - state.offsetY;
      return;
    }

    // Freehand and eraser tools.
    if (modeRef.current === "freehand" || modeRef.current === "eraser") {
      if (modeRef.current === "eraser") {
        state.isErasing = true;
        state.eraserPoints = [{ x: worldX, y: worldY }];
      } else {
        state.isFreehandDrawing = true;
        state.freehandPoints = [{ x: worldX, y: worldY }];
      }
      scheduleRender();
      return;
    }

    // Text is handled on double-click.
    if (modeRef.current === "text") {
      return;
    }

    // For other shapes, start drawing.
    state.isDrawing = true;
    state.startX = worldX;
    state.startY = worldY;
    state.currentX = worldX;
    state.currentY = worldY;
    scheduleRender();
  }

  // Mousemove handler.
  function handleMouseMove(e: MouseEvent) {
    const worldX = (e.clientX - state.offsetX) / state.scale;
    const worldY = (e.clientY - state.offsetY) / state.scale;

    if (state.isErasing) {
      state.eraserPoints.push({ x: worldX, y: worldY });
      scheduleRender();
      return;
    }
    if (state.isFreehandDrawing) {
      state.freehandPoints.push({ x: worldX, y: worldY });
      scheduleRender();
      return;
    }
    if (state.isDrawing) {
      state.currentX = worldX;
      state.currentY = worldY;
      scheduleRender();
      return;
    }
    if (state.isPanning) {
      state.offsetX = e.clientX - state.panStartX;
      state.offsetY = e.clientY - state.panStartY;
      scheduleRender();
    }
  }

  // Mouseup handler.
  function handleMouseUp(e: MouseEvent) {
    const worldX = (e.clientX - state.offsetX) / state.scale;
    const worldY = (e.clientY - state.offsetY) / state.scale;

    if (e.button === 0 && state.isErasing) {
      state.isErasing = false;
      const newShape: Shape = {
        type: "eraser",
        points: state.eraserPoints,
        size: strokeWidthRef.current * 10,
      };
      state.shapes.push(newShape);
      sendShapeMessage(newShape);
      state.eraserPoints = [];
      scheduleRender();
      return;
    }
    if (e.button === 0 && state.isFreehandDrawing) {
      state.isFreehandDrawing = false;
      const newShape: Shape = {
        type: "freehand",
        points: state.freehandPoints,
        strokeColor: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
      };
      state.shapes.push(newShape);
      sendShapeMessage(newShape);
      state.freehandPoints = [];
      scheduleRender();
      return;
    }
    if (e.button === 0 && state.isDrawing) {
      state.isDrawing = false;
      let newShape: Shape | null = null;
      if (modeRef.current === "rect") {
        newShape = {
          type: "rectangle",
          x: state.startX,
          y: state.startY,
          width: (state.currentX || worldX) - state.startX,
          height: (state.currentY || worldY) - state.startY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "circle") {
        const centerX = (state.startX + (state.currentX || worldX)) / 2;
        const centerY = (state.startY + (state.currentY || worldY)) / 2;
        newShape = {
          type: "circle",
          x: centerX,
          y: centerY,
          radiusX: Math.abs((state.currentX || worldX) - state.startX) / 2,
          radiusY: Math.abs((state.currentY || worldY) - state.startY) / 2,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "line") {
        newShape = {
          type: "line",
          x1: state.startX,
          y1: state.startY,
          x2: state.currentX || worldX,
          y2: state.currentY || worldY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "triangle") {
        const dx = (state.currentX || worldX) - state.startX;
        const dy = (state.currentY || worldY) - state.startY;
        const midX = (state.startX + (state.currentX || worldX)) / 2;
        const midY = (state.startY + (state.currentY || worldY)) / 2;
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY - dx * (Math.sqrt(3) / 2);
        newShape = {
          type: "triangle",
          x1: state.startX,
          y1: state.startY,
          x2: state.currentX || worldX,
          y2: state.currentY || worldY,
          x3: thirdX,
          y3: thirdY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "arrow") {
        newShape = {
          type: "arrow",
          x1: state.startX,
          y1: state.startY,
          x2: state.currentX || worldX,
          y2: state.currentY || worldY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      }
      if (newShape) {
        state.shapes.push(newShape);
        sendShapeMessage(newShape);
      }
      state.currentX = undefined;
      state.currentY = undefined;
      scheduleRender();
      return;
    }
    if (e.button === 2 && state.isPanning) {
      state.isPanning = false;
    }
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
        updateText(state.textPreview.text + event.key);
      }
    }

    // This mousedown listener cancels the text input (saving the text) if the user clicks elsewhere.
    function handleTextCancel(e: MouseEvent) {
      cleanup();
    }

    function cleanup() {
      clearInterval(cursorInterval);
      // Finalize the text if any non-empty content exists.
      if (state.textPreview && state.textPreview.text.trim().length > 0) {
        const newShape: Shape = {
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
    activeTextCleanup = cleanup;
  }

  // Register event listeners.
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("wheel", handleWheel);
  canvas.addEventListener("dblclick", handleDoubleClick);

  // Initial render.
  scheduleRender();

  return function cleanup() {
    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("wheel", handleWheel);
    canvas.removeEventListener("dblclick", handleDoubleClick);
    // remove any additional event listeners you added
  };
}
