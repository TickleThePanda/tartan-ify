function resizeCanvas(canvas: HTMLCanvasElement) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientWidth;
}

class CanvasSizeManager {
  canvases: {
    canvas: HTMLCanvasElement;
    callback?: () => void;
  }[] = [];
  constructor() {
    window.addEventListener("resize", () => {
      this.canvases.forEach((c) => {
        resizeCanvas(c.canvas);
        if (c.callback) {
          c.callback();
        }
      });
    });
  }

  add(canvas: HTMLCanvasElement, callback?: () => void): void {
    this.canvases.push({
      canvas: canvas,
      callback: callback,
    });
    resizeCanvas(canvas);
  }

  triggerResize(): void {
    this.canvases.map((c) => c.canvas).forEach(resizeCanvas);
  }
}

export { CanvasSizeManager };
