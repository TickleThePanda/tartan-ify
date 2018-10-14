function hslToRgb(h, s, l){
	var r, g, b;

	if (s == 0){
		r = g = b = l; // achromatic
	}else{
		var hue2rgb = function hue2rgb(p, q, t){
				if(t < 0) t += 1;
				if(t > 1) t -= 1;
				if(t < 1/6) return p + (q - p) * 6 * t;
				if(t < 1/2) return q;
				if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
		}

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}

	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

class MusicSimilarityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  async render(data) {

    this.context.fillStyle = '#000000';
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (data.length > 0) {
      const offset = 50;

      const max = data
          .reduce((a, b) => Math.max(a, b));

      const min = data
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

      const range = max - min;

			const width = Math.sqrt(data.length);

      const pixelWidth = (this.canvas.width - 50) / width;

      const buffer = new Uint8ClampedArray(width * width * 4);

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < width; j++) {

          const v = data[j * width + i];

          const pos = (j * width + i) * 4;
          
					const norm = (v - min) / range;

          const h = (180 + 130 - norm * 130) / 360;

					const rgb = hslToRgb(h, 1, 0.7);

          if (v === 0) {
            rgb[0] = 255;
            rgb[1] = 255;
            rgb[2] = 255;
          }

          buffer[pos    ] = rgb[0];
          buffer[pos + 1] = rgb[1];
          buffer[pos + 2] = rgb[2];
          buffer[pos + 3] = 255;

        }
      }

			const image = this.context.createImageData(width, width);
			
			image.data.set(buffer);

      const bmp = await createImageBitmap(image, 0, 0, width, width);

      this.context.imageSmoothingEnabled = false;
			this.context.drawImage(bmp, 50, 50, this.canvas.width - 50, this.canvas.width - 50);

      const ticksFreq = 10;

      for (let i = 0; i < data.length; i = i + ticksFreq) {
        const fontSize = 14;

        this.context.fillStyle = '#000000';
        this.context.font = fontSize + 'px "Source Code Sans"';
        this.context.fillText(i + "s", offset + i * pixelWidth, 50 - 5);
        this.context.fillText(i + "s", 5, offset + fontSize + i * pixelWidth, 50 - 5, 50);
      }

    }
  }
}

let width = 0;
let height = 0;

onmessage = function(message) {

  if (message.data instanceof ArrayBuffer) {

    const buffer = message.data;

    const data = new Uint8Array(buffer);

    const canvas = new OffscreenCanvas(width, height);

    const renderer = new MusicSimilarityRenderer(canvas);

    renderer.render(data)
      .then(() => {
        const image = canvas.transferToImageBitmap();
        postMessage(image, [image]);
      });
  } else {
    width = message.data.width;
    height = message.data.height;
  }
}

