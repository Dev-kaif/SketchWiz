type Shape =
  | { type: "rectangle"; x: number; y: number; width: number; height: number }
  | { type: "circle"; x: number; y: number; radiusX: number; radiusY: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | {type: "triangle"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number;};
  

// Global array to store drawn shapes.
const existingShape: Shape[] = [];

export default function initDraw(
  canvas: HTMLCanvasElement,
  modeRef: React.RefObject<"rect" | "circle" | "line" | "triangle" | null>
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
  let startX = 0;
  let startY = 0;
  let panStartX = 0;
  let panStartY = 0;

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
      } else if (shape.type == "triangle") {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.lineTo(shape.x3, shape.y3);
        ctx.closePath();
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Prevent the default context menu so that right-click can be used for panning.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Mousedown: differentiate between drawing (left button) and panning (right button).
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // RIGHT BUTTON: Begin panning.
      isPanning = true;
      panStartX = e.clientX - offsetX;
      panStartY = e.clientY - offsetY;
      return;
    }
    // LEFT BUTTON: Begin drawing.
    isDrawing = true;
    // Convert screen coordinates to world coordinates.
    startX = (e.clientX - offsetX) / scale;
    startY = (e.clientY - offsetY) / scale;
  });

  // Mousemove: update drawing preview or panning.
  canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
      // Compute current pointer world coordinates.
      const currentX = (e.clientX - offsetX) / scale;
      const currentY = (e.clientY - offsetY) / scale;

      // Clear and redraw all existing shapes.
      renderAll();

      // Draw the preview shape.
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      if (modeRef.current == "rect") {
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      } else if (modeRef.current === "circle") {
        // Calculate bounding box and derive center and radii.
        const centerX = (startX + currentX) / 2;
        const centerY = (startY + currentY) / 2;

        const radiusX = Math.abs(currentX - startX) / 2;
        const radiusY = Math.abs(currentY - startY) / 2;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (modeRef.current == "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      } else if (modeRef.current == "triangle") {
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
      // Update pan offsets.
      offsetX = e.clientX - panStartX;
      offsetY = e.clientY - panStartY;
      renderAll();
    }
  });

  // Mouseup: finalize drawing or end panning.
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0 && isDrawing) {
      // Finish drawing.
      isDrawing = false;
      const endX = (e.clientX - offsetX) / scale;
      const endY = (e.clientY - offsetY) / scale;

      if (modeRef.current == "rect") {
        const width = endX - startX;
        const height = endY - startY;
        existingShape.push({
          type: "rectangle",
          x: startX,
          y: startY,
          width,
          height,
        });
      } else if (modeRef.current === "circle") {
        // Compute the ellipse using the bounding box.
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        existingShape.push({
          type: "circle",
          x: centerX,
          y: centerY,
          radiusX,
          radiusY,
        });
      } else if (modeRef.current == "line") {
        existingShape.push({
          type: "line",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
        });
      } else if (modeRef.current == "triangle") {
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
      }
      renderAll();
    } else if (e.button === 2 && isPanning) {
      // End panning.
      isPanning = false;
    }
  });


  // Define minimum and maximum scale values.
  const minScale = 0.4;
  const maxScale = 1;

  // Wheel event for zooming in/out.
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.001;
    let newScale = scale - e.deltaY * zoomIntensity;

    // Apply both min and max scale limits.
    newScale = Math.max(newScale, minScale);
    newScale = Math.min(newScale, maxScale);

    // Get mouse position relative to the canvas.
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to world coordinates before zoom.
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    // Adjust the offset so that the point under the mouse remains fixed.
    offsetX = mouseX - worldX * newScale;
    offsetY = mouseY - worldY * newScale;
    scale = newScale;
    renderAll();
  });

  // Initial render.
  renderAll();
}
