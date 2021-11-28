function resizeCanvas(canvas) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientWidth;
}

class CanvasSizeManager {
  constructor() {
    const canvases = [];
    this.canvases = canvases;

    window.addEventListener('resize', function() {
      canvases.forEach(c => {
        resizeCanvas(c.canvas);
        if (c.callback) {
          c.callback();
        }
      });
    });
  }

  add(canvas, callback) {
    this.canvases.push({
      canvas: canvas,
      callback: callback
    });
    resizeCanvas(canvas);
  }

  triggerResize() {
    this.canvases.map(c => c.canvas)
      .forEach(resizeCanvas);
  }
}

export { CanvasSizeManager };