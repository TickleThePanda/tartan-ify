import { CanvasSizeManager } from "./view--canvas-size.js";
import { VisView } from "./view--vis-view.js";

type SingleVisualisationPainterArgs = {
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  canvasSizeManager: CanvasSizeManager
}

type SingleVisualisationStartArgs = {
  image: ImageBitmap,
  bpm: number,
  colors: {
    similar: string,
    diff: string
  }
}

export class SingleVisualisationPainter implements VisView {
  wrapper;
  canvas;
  context;
  canvasSizeManager;

  constructor({
    wrapper,
    canvas,
    context,
    canvasSizeManager
  }: SingleVisualisationPainterArgs) {
    this.wrapper = wrapper
    this.canvas = canvas;
    this.context = context;
    this.canvasSizeManager = canvasSizeManager;
  }

  show() {
    this.wrapper.classList.remove("hidden");
    this.canvasSizeManager.triggerResize();
  }

  start({
    image,
    bpm,
    colors
  }: SingleVisualisationStartArgs) {

    this.wrapper.style.setProperty('--color-similar', colors.similar);
    this.wrapper.style.setProperty('--color-diff', colors.diff);

    const canvas = this.canvas;
    const context = this.context;
    const interval = 1000 / (bpm / 60);

    const startTime = Date.now();

    let elapsedIntervals = 0;

    (function loop() {
      window.requestAnimationFrame(function() {

        elapsedIntervals = Math.floor((Date.now() - startTime) / interval);

        draw();

        if (elapsedIntervals < image.width) {
          loop();
        }
      });
    })();

    window.addEventListener('resize', function() {
      window.requestAnimationFrame(function() {
        draw();
      });
    });

    function draw() {
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const wholeImageControl = <HTMLInputElement> document.getElementById('show-whole-image');
      const cursorControl = <HTMLInputElement> document.getElementById('show-cursor');

      if (wholeImageControl.checked) {
        context.drawImage(image, 0, 0, image.width, image.width, 0, 0, canvas.width, canvas.width);

        const pixelSize = canvas.width / image.width;
        const progressOnCanvas = pixelSize * elapsedIntervals - pixelSize / 2;

        if (cursorControl.checked) {
          const path = new Path2D();

          path.moveTo(0, progressOnCanvas);
          path.lineTo(progressOnCanvas, progressOnCanvas);
          path.lineTo(progressOnCanvas, 0);
          context.lineWidth = pixelSize;
          context.strokeStyle = 'black';
          context.stroke(path);
        }

      } else {
        context.drawImage(image, 0, 0, elapsedIntervals, elapsedIntervals, 0, 0, canvas.width, canvas.width);
      }
    }
  }
}
