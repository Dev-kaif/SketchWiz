
type Shape =
  | {
      type: "rectriangle"
      x: number
      y: number
      width: number
      height: number
    }
  | {
      type: "circle"
      x: number
      y: number
      radius: number
    }

// Global array to store drawn shapes.
const existingShape: Shape[] = []

export default function initDraw(canvas: HTMLCanvasElement,modeRef:React.RefObject<"rect" | "circle" | null>) {

  const ctx = canvas.getContext("2d")
  if (!ctx) return;
  ctx.strokeStyle = "#ffffff"

  // Current transformation (world) parameters.
  let offsetX = 0
  let offsetY = 0
  let scale = 1

  // State flags and starting coordinates.
  let isDrawing = false
  let isPanning = false
  let startX = 0
  let startY = 0
  let panStartX = 0
  let panStartY = 0

  // A helper function to render all shapes using the current transform.
  function renderAll() {
    if(!ctx)return;
    
    // Clear the entire canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()

    // Apply pan and zoom.
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
  
    // Render each saved shape.
    existingShape.forEach((shape) => {
      if (shape.type === "rectriangle") {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
      }
    })
    ctx.restore()
  }

  // Prevent the default context menu so that right-click can be used for panning.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault())

  // Mousedown: differentiate between drawing (left button) and panning (right button).
  canvas.addEventListener("mousedown", (e) => {
     if (e.button === 2) {
        // RIGHT BUTTON: Begin panning.
        isPanning = true
        panStartX = e.clientX - offsetX
        panStartY = e.clientY - offsetY
        return;
      }
        // LEFT BUTTON: Begin drawing.
        isDrawing = true
        // Convert screen coordinates to world coordinates.
        startX = (e.clientX - offsetX) / scale
        startY = (e.clientY - offsetY) / scale
  })

  // Mousemove: update drawing preview or panning.
  canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
      // Compute current pointer world coordinates.
      const currentX = (e.clientX - offsetX) / scale
      const currentY = (e.clientY - offsetY) / scale

      // Clear and redraw all existing shapes.
      renderAll()

      // Draw the preview shape.
      ctx.save()
      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)


      if(modeRef.current == "rect"){
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY)
      }
      ctx.restore()

    } else if (isPanning) {
      // Update pan offsets.
      offsetX = e.clientX - panStartX
      offsetY = e.clientY - panStartY
      renderAll()
    }
  })

  // Mouseup: finalize drawing or end panning.
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0 && isDrawing) {
      // Finish drawing.
      isDrawing = false
      const endX = (e.clientX - offsetX) / scale
      const endY = (e.clientY - offsetY) / scale

      if(modeRef.current == "rect"){
        const width = endX - startX
        const height = endY - startY
        existingShape.push({
          type: "rectriangle",
          x: startX,
          y: startY,
          width,
          height,
        })
      }
      renderAll()

    } else if (e.button === 2 && isPanning) {
      // End panning.
      isPanning = false
    }
  })

  // In case the mouse leaves the canvas, cancel any ongoing interactions.
  canvas.addEventListener("mouseleave", () => {
    if (isDrawing || isPanning) {
      isDrawing = false
      isPanning = false
      renderAll()
    }
  })


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
  renderAll()
}