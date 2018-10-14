class MusicSimilarityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  render(data) {

    this.context.fillStyle = '#000000';
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (data.length > 0) {
      const offset = 50;

      const width = (this.canvas.width - 50) / data.length;

      const max = [].concat.apply([], data)
          .map(i => i.diff)
          .reduce((a, b) => Math.max(a, b));

      const min = [].concat.apply([], data)
          .map(i => i.diff)
          .filter(i => i !== 0)
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

      const range = max - min;

      this.context.beginPath();

      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {

          const v = data[i][j].diff;

          if (v === 0) {
            this.context.fillStyle = `#ffffff`;
          } else {
            const norm = (v - min) / range;

            const h = 180 + 130 - norm * 130;

            this.context.fillStyle = `hsl(${h}, 100%, 70%)`;
          }


          const startX = offset + (i * width);
          const startY = offset + (j * width);

          this.context.fillRect(startX, startY, width, width);
        }
      }

      const ticksFreq = 10;

      for (let i = 0; i < data.length; i = i + ticksFreq) {
        const fontSize = 14;

        this.context.fillStyle = '#000000';
        this.context.font = fontSize + 'px "Source Code Sans"';
        this.context.fillText(i + "s", offset + i * width, 50 - 5);
        this.context.fillText(i + "s", 5, offset + fontSize + i * width, 50 - 5, 50);
      }

      this.context.closePath();
    }
  }
}

onmessage = function(message) {
  const data = message.data.results;
  const width = message.data.width;
  const height = message.data.height;

  const canvas = new OffscreenCanvas(width, height);

  const renderer = new MusicSimilarityRenderer(canvas);

  renderer.render(data);

  postMessage(canvas.transferToImageBitmap());

}

