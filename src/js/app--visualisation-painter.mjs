class VisualisationPainter {
  constructor(canvas, context, image, interval) {
    this.canvas = canvas;
    this.context = context;
    this.image = image;
    this.interval = interval;
  }

  start() {

    const image = this.image;
    const canvas = this.canvas;
    const context = this.context;
    const interval = this.interval;

    const startTime = new Date();

    let elapsedIntervals = 0;

    (function loop() {
      window.requestAnimationFrame(function() {

        elapsedIntervals = Math.floor((new Date() - startTime) / interval);

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

      const wholeImageControl = document.getElementById('show-whole-image');
      const cursorControl = document.getElementById('show-cursor');

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

export { VisualisationPainter };