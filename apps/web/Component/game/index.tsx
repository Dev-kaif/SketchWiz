type Shape =
  | { type: "rectangle"; x: number; y: number; width: number; height: number }
  | { type: "circle"; x: number; y: number; radiusX: number; radiusY: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | {
      type: "triangle";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x3: number;
      y3: number;
    }
  | { type: "freehand"; points: { x: number; y: number }[] }
  | { type: "text"; x: number; y: number; content: string }
  | { type: "eraser"; points: { x: number; y: number }[]; size: number }
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number };

// Global array to store drawn shapes.
const existingShape: Shape[] = [];

export default function initDraw(
  canvas: HTMLCanvasElement,
  modeRef: React.RefObject<
    "rect" | "circle" | "line" | "triangle" | "freehand" | "text" | "eraser" | "arrow" | null
  >
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;

  // Current transformation (world) parameters.
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;

  // State flags and starting coordinates.
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
  const eraserSize = 30; // Default eraser size

  // A helper function to render all shapes using the current transform.
  function renderAll() {
    if (!ctx) return;

    // Clear the entire canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply pan and zoom.
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Render each saved shape.
    existingShape.forEach((shape) => {
      if (shape.type === "rectangle") {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
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
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      } else if (shape.type === "triangle") {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.lineTo(shape.x3, shape.y3);
        ctx.closePath();
        ctx.stroke();
      } else if (shape.type === "freehand") {
        ctx.beginPath();
        ctx.moveTo(shape.points?.[0]?.x || 0, shape.points?.[0]?.y || 0); // Safe access
        shape.points.forEach((p, index) => {
          if (index === 0) return;
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (shape.type === "text") {
        ctx.font = "1.5vw Arial"; // Set font size and style
        ctx.fillStyle = "#ffffff"; // Set text color
        ctx.fillText(shape.content, shape.x, shape.y); // Draw text
      } else if (shape.type === "eraser") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = shape.size;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shape.points?.[0]?.x || 0, shape.points?.[0]?.y || 0); // Safe access
        shape.points.forEach((p, index) => {
          if (index === 0) return;
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      } else if (shape.type === "arrow") {
        // Draw the main line.
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      
        // Set fill style for the arrowhead.
        ctx.fillStyle = "#ffffff";  // Ensure the arrowhead is white.
      
        // Draw the arrowhead.
        const headLength = 10;
        const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
        ctx.beginPath();
        ctx.moveTo(shape.x2, shape.y2);
        ctx.lineTo(
          shape.x2 - headLength * Math.cos(angle - Math.PI / 6),
          shape.y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          shape.x2 - headLength * Math.cos(angle + Math.PI / 6),
          shape.y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      
    });
    ctx.restore();
  }

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
      renderAll(); // Redraw canvas to clear previous text

      if (!ctx) return;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.font = "1.5vw Arial";
      ctx.fillStyle = "white";

      // Append cursor if active.
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
        existingShape.push({
          type: "text",
          x: textX,
          y: textY,
          content: currentText,
        });
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

  // Prevent the default context menu so that right-click can be used for panning.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Mousedown: differentiate between drawing (left button), panning (right button),
  // freehand drawing, and erasing.
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // RIGHT BUTTON: Begin panning.
      isPanning = true;
      panStartX = e.clientX - offsetX;
      panStartY = e.clientY - offsetY;
      return;
    }

    // Handle freehand drawing or erasing.
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

  // Mousemove: update drawing preview, freehand drawing, erasing, or panning.
  canvas.addEventListener("mousemove", (e) => {
    if (isErasing) {
      const newX = (e.clientX - offsetX) / scale;
      const newY = (e.clientY - offsetY) / scale;
      eraserPoints.push({ x: newX, y: newY });

      renderAll();
      // Draw the eraser preview.
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

  // Mouseup: finalize drawing, freehand drawing, erasing, or end panning.
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0 && isErasing) {
      isErasing = false;
      // Save the eraser stroke as a shape.
      existingShape.push({
        type: "eraser",
        points: eraserPoints,
        size: eraserSize,
      });
      eraserPoints = [];
      renderAll();
      return;
    }

    if (e.button === 0 && isFreehandDrawing) {
      isFreehandDrawing = false;
      existingShape.push({
        type: "freehand",
        points: freehandPoints,
      });
      renderAll();
      return;
    }

    if (e.button === 0 && isDrawing) {
      isDrawing = false;
      const endX = (e.clientX - offsetX) / scale;
      const endY = (e.clientY - offsetY) / scale;

      if (modeRef.current === "rect") {
        existingShape.push({
          type: "rectangle",
          x: startX,
          y: startY,
          width: endX - startX,
          height: endY - startY,
        });
      } else if (modeRef.current === "circle") {
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        existingShape.push({
          type: "circle",
          x: centerX,
          y: centerY,
          radiusX: Math.abs(endX - startX) / 2,
          radiusY: Math.abs(endY - startY) / 2,
        });
      } else if (modeRef.current === "line") {
        existingShape.push({
          type: "line",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
        });
      } else if (modeRef.current === "triangle") {
        const dx = endX - startX;
        const dy = endY - startY;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const thirdX = midX - dy * (Math.sqrt(3) / 2);
        const thirdY = midY - dx * (Math.sqrt(3) / 2);
        existingShape.push({
          type: "triangle",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          x3: thirdX,
          y3: thirdY,
        });
      } else if (modeRef.current === "arrow") {
        existingShape.push({
          type: "arrow",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
        });
      }
      renderAll();
    } else if (e.button === 2 && isPanning) {
      isPanning = false;
    }
  });

  // Wheel event for zooming in/out.
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
