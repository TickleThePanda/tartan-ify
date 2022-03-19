import { convertImage } from "./tool--image-data-to-bitmap";
import { CanvasSizeManager } from "./canvas-size-manager";
import { VisView } from "./vis-view";

type SingleVisualisationPainterArgs = {
  wrapper: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasSizeManager: CanvasSizeManager;
};

type SingleVisualisationStartArgs = {
  image: Uint8ClampedArray;
  bpm: number;
  colors: {
    similar: string;
    diff: string;
  };
};

export class SingleVisualisationPainter implements VisView {
  wrapper;
  canvas;
  context;
  canvasSizeManager;

  constructor({
    wrapper,
    canvas,
    context,
    canvasSizeManager,
  }: SingleVisualisationPainterArgs) {
    this.wrapper = wrapper;
    this.canvas = canvas;
    this.context = context;
    this.canvasSizeManager = canvasSizeManager;
  }

  show(): void {
    this.wrapper.classList.remove("hidden");
    this.canvasSizeManager.triggerResize();
  }

  async start({
    image: imageData,
    bpm,
    colors,
  }: SingleVisualisationStartArgs): Promise<void> {
    const image = await convertImage(this.context, imageData);

    this.wrapper.style.setProperty("--color-similar", colors.similar);
    this.wrapper.style.setProperty("--color-diff", colors.diff);

    const canvas = this.canvas;
    const context = this.context;
    const interval = 1000 / (bpm / 60);

    const startTime = Date.now();

    let elapsedIntervals = 0;
    let position: { x: number; y: number; px: number; py: number } | undefined =
      undefined;

    (function loop() {
      window.requestAnimationFrame(function () {
        elapsedIntervals = Math.min(
          image.width,
          Math.floor((Date.now() - startTime) / interval)
        );

        draw();

        if (elapsedIntervals < image.width) {
          loop();
        }
      });
    })();

    window.addEventListener("resize", function () {
      window.requestAnimationFrame(function () {
        draw();
      });
    });

    canvas.addEventListener("mousemove", function (evt: MouseEvent) {
      position = {
        x: evt.clientX - canvas.offsetLeft,
        y: evt.clientY - canvas.offsetTop,
        px: (evt.clientX - canvas.offsetLeft) / canvas.width,
        py: (evt.clientY - canvas.offsetTop) / canvas.height,
      };
    });
    canvas.addEventListener("mouseleave", function () {
      position = undefined;
    });

    function draw() {
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);

      const wholeImageControl = <HTMLInputElement>(
        document.getElementById("show-whole-image")
      );
      const cursorControl = <HTMLInputElement>(
        document.getElementById("show-cursor")
      );

      if (wholeImageControl.checked) {
        context.drawImage(
          image,
          0,
          0,
          image.width,
          image.width,
          0,
          0,
          canvas.width,
          canvas.width
        );

        const pixelSize = canvas.width / image.width;
        const progressOnCanvas = pixelSize * elapsedIntervals - pixelSize / 2;

        if (cursorControl.checked) {
          const path = new Path2D();

          path.moveTo(0, progressOnCanvas);
          path.lineTo(progressOnCanvas, progressOnCanvas);
          path.lineTo(progressOnCanvas, 0);
          context.lineWidth = Math.max(pixelSize, 1);
          context.strokeStyle = "black";
          context.stroke(path);
        }

        console.log(
          JSON.stringify(position) + " " + image.width + " " + canvas.width
        );

        const zoom = 4;
        if (position !== undefined && image.width * zoom > canvas.width) {
          console.log("Drawing zoomed in");
          const zoomBoxSize = canvas.width / 4;
          const zoomBoxOffset = zoomBoxSize / 2;

          const proportionalSize = image.width / canvas.width / zoom;
          const proportionalOffset = proportionalSize * zoomBoxOffset;

          const imageX = position.px * image.width - proportionalOffset;
          const imageY = position.py * image.height - proportionalOffset;
          const imageSize = proportionalOffset * 2;

          console.log(`${imageX} ${imageY} ${imageSize}`);

          context.drawImage(
            image,
            imageX,
            imageY,
            imageSize,
            imageSize,
            position.x - zoomBoxOffset,
            position.y - zoomBoxOffset,
            zoomBoxSize,
            zoomBoxSize
          );
        }
      } else {
        context.drawImage(
          image,
          0,
          0,
          elapsedIntervals,
          elapsedIntervals,
          0,
          0,
          canvas.width,
          canvas.width
        );
      }
    }
  }
}
