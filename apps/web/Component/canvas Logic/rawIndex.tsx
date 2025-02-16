import axios from "../axios/index";
import { BACKEND_URL } from "../Config";

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
      points: { x: number; y: number }[];
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      content: string;
      strokeColor: string;
    }
  | {
      type: "eraser";
      points: { x: number; y: number }[];
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

// Global array to store drawn shapes.
const existingShape: Shape[] = [];

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
  params: Promise<{ slug: string }>
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Get previous shapes and roomId.
  async function getPreviousShapes() {
    const slug = (await params).slug;
    const roomIdRes = await axios.get(`${BACKEND_URL}/api/room/slug/${slug}`);
    const roomId = roomIdRes.data.room.id;

    socket.send(JSON.stringify({ type: "join_room", roomId: roomId }));
    const res = await axios.get(`${BACKEND_URL}/api/room/${roomId}`);

    return { messages: res.data.messages, roomId };
  }

  const { messages, roomId } = await getPreviousShapes();

  async function addShapes() {
    if (messages.length === 0) return;
    messages.map((msg: { id: number; message: string }) => {
      existingShape.push(JSON.parse(msg.message));
    });
  }
  await addShapes();

  socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "chat" && data.message) {
        existingShape.push(data.message);
        renderAll();
      }
  };

  // Helper to send a shape over the WebSocket.
  function sendShapeMessage(shape: Shape) {
    const message = {
      type: "chat",
      roomId: roomId,
      message: shape,
    };
    socket.send(JSON.stringify(message));
  }

  // Helper to render all shapes.
  function renderAll() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    existingShape.forEach((shape) => {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowBlur = 2;

      if (shape.type === "rectangle") {
        ctx.shadowColor = shape.strokeColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
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
      } else if (shape.type === "line") {
        ctx.shadowColor = shape.strokeColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      } else if (shape.type === "triangle") {
        ctx.shadowColor = shape.strokeColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.lineTo(shape.x3, shape.y3);
        ctx.closePath();
        ctx.stroke();
      } else if (shape.type === "freehand") {
        ctx.shadowColor = shape.strokeColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(shape.points?.[0]?.x || 0, shape.points?.[0]?.y || 0);
        shape.points.forEach((p, index) => {
          if (index === 0) return;
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (shape.type === "text") {
        ctx.font = "1.5vw Arial";
        ctx.fillStyle = shape.strokeColor;
        ctx.fillText(shape.content, shape.x, shape.y);
      } else if (shape.type === "eraser") {
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = shape.size;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shape.points?.[0]?.x || 0, shape.points?.[0]?.y || 0);
        shape.points.forEach((p, index) => {
          if (index === 0) return;
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (shape.type === "arrow") {
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
      }
      ctx.restore();
    });
    ctx.restore();
  }

  // Transformation parameters.
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;

  // Flags and coordinates.
  let isDrawing = false;
  let isPanning = false;
  let isFreehandDrawing = false;
  let isErasing = false;
  let startX = 0;
  let startY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let freehandPoints: { x: number; y: number }[] = [];
  let eraserPoints: { x: number; y: number }[] = [];
  const eraserSize = strokeWidthRef.current * 10;

  // Text input handling.
  canvas.addEventListener("dblclick", (e: MouseEvent) => {
    if (modeRef.current !== "text") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const textX = (e.clientX - offsetX) / scale;
    const textY = (e.clientY - offsetY) / scale;
    let currentText = "";
    let showCursor = true;
    function drawTextPreview() {
      renderAll();
      if (!ctx) return;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.font = "1.5vw Arial";
      ctx.fillStyle = strokeColorRef.current;
      const displayText = showCursor ? currentText + "|" : currentText;
      ctx.fillText(displayText, textX, textY);
      ctx.restore();
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        saveText();
      } else if (event.key === "Backspace") {
        currentText = currentText.slice(0, -1);
        drawTextPreview();
      } else if (event.key.length === 1) {
        currentText += event.key;
        drawTextPreview();
      }
    }
    function handleOutsideClick(event: MouseEvent) {
      if (event.target !== canvas) return;
      if (currentText.trim().length > 0) {
        saveText();
      } else {
        cleanup();
      }
    }
    function saveText() {
      if (currentText.trim().length > 0) {
        const newShape: Shape = {
          type: "text",
          x: textX,
          y: textY,
          content: currentText,
          strokeColor: strokeColorRef.current,
        };
        existingShape.push(newShape);
        sendShapeMessage(newShape);
      }
      cleanup();
    }
    function cleanup() {
      clearInterval(cursorInterval);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("mousedown", handleOutsideClick);
      renderAll();
    }
    drawTextPreview();
    const cursorInterval = setInterval(() => {
      showCursor = !showCursor;
      drawTextPreview();
    }, 500);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("mousedown", handleOutsideClick);
  });

  // Prevent default context menu.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Mousedown event.
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      isPanning = true;
      panStartX = e.clientX - offsetX;
      panStartY = e.clientY - offsetY;
      return;
    }
    if (modeRef.current === "freehand" || modeRef.current === "eraser") {
      if (modeRef.current === "eraser") {
        isErasing = true;
        eraserPoints = [
          {
            x: (e.clientX - offsetX) / scale,
            y: (e.clientY - offsetY) / scale,
          },
        ];
        return;
      } else {
        isFreehandDrawing = true;
        freehandPoints = [
          {
            x: (e.clientX - offsetX) / scale,
            y: (e.clientY - offsetY) / scale,
          },
        ];
        return;
      }
    }

    // LEFT BUTTON: Begin drawing other shapes.
    isDrawing = true;
    startX = (e.clientX - offsetX) / scale;
    startY = (e.clientY - offsetY) / scale;
  });

  // Mousemove event.
  canvas.addEventListener("mousemove", (e) => {
    if (isErasing) {
      const newX = (e.clientX - offsetX) / scale;
      const newY = (e.clientY - offsetY) / scale;
      eraserPoints.push({ x: newX, y: newY });
      renderAll();
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = eraserSize;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(eraserPoints[0]?.x || 0, eraserPoints[0]?.y || 0);
      eraserPoints.forEach((pt, idx) => {
        if (idx === 0) return;
        ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (isFreehandDrawing) {
      const newX = (e.clientX - offsetX) / scale;
      const newY = (e.clientY - offsetY) / scale;
      freehandPoints.push({ x: newX, y: newY });
      renderAll();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.shadowColor = strokeColorRef.current;
      ctx.strokeStyle = strokeColorRef.current;
      ctx.lineWidth = strokeWidthRef.current;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(freehandPoints[0]?.x || 0, freehandPoints[0]?.y || 0);
      freehandPoints.forEach((point, index) => {
        if (index === 0) return;
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (isDrawing) {
      const currentX = (e.clientX - offsetX) / scale;
      const currentY = (e.clientY - offsetY) / scale;
      renderAll();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.shadowColor = strokeColorRef.current;
      ctx.strokeStyle = strokeColorRef.current;
      ctx.lineWidth = strokeWidthRef.current;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
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
    } else if (isPanning) {
      offsetX = e.clientX - panStartX;
      offsetY = e.clientY - panStartY;
      renderAll();
    }
  });

  // Mouseup event.
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0 && isErasing) {
      isErasing = false;
      const newShape: Shape = {
        type: "eraser",
        points: eraserPoints,
        size: eraserSize,
      };
      existingShape.push(newShape);
      renderAll();
      sendShapeMessage(newShape);
      eraserPoints = [];
      return;
    }
    if (e.button === 0 && isFreehandDrawing) {
      isFreehandDrawing = false;
      const newShape: Shape = {
        type: "freehand",
        points: freehandPoints,
        strokeColor: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
      };
      existingShape.push(newShape);
      renderAll();
      sendShapeMessage(newShape);
      return;
    }
    if (e.button === 0 && isDrawing) {
      isDrawing = false;
      const endX = (e.clientX - offsetX) / scale;
      const endY = (e.clientY - offsetY) / scale;
      let newShape: Shape | null = null;
      if (modeRef.current === "rect") {
        newShape = {
          type: "rectangle",
          x: startX,
          y: startY,
          width: endX - startX,
          height: endY - startY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "circle") {
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        newShape = {
          type: "circle",
          x: centerX,
          y: centerY,
          radiusX: Math.abs(endX - startX) / 2,
          radiusY: Math.abs(endY - startY) / 2,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "line") {
        newShape = {
          type: "line",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "triangle") {
        const dx = endX - startX;
        const dy = endY - startY;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY - dx * (Math.sqrt(3) / 2);
        newShape = {
          type: "triangle",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          x3: thirdX,
          y3: thirdY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      } else if (modeRef.current === "arrow") {
        newShape = {
          type: "arrow",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          strokeColor: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
        };
      }
      if (newShape) {
        existingShape.push(newShape);
        renderAll();
        sendShapeMessage(newShape);
      }
    } else if (e.button === 2 && isPanning) {
      isPanning = false;
    }
  });

  // Wheel event for zooming.
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.001;
    let newScale = scale - e.deltaY * zoomIntensity;
    const minScale = 0.4;
    const maxScale = 1;
    newScale = Math.max(newScale, minScale);
    newScale = Math.min(newScale, maxScale);
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;
    offsetX = mouseX - worldX * newScale;
    offsetY = mouseY - worldY * newScale;
    scale = newScale;
    renderAll();
  });

  // Initial render.
  renderAll();
}
