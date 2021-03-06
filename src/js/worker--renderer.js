importScripts('lib--color.js');

function scale(data) {

    const max = data
          .filter(m => m !== -1)
          .reduce((a, b) => Math.max(a, b), Number.MIN_SAFE_INTEGER);

    const min = data
          .filter(m => m !== -1)
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

    const range = max - min;

    return data
      .map(v => v === -1 ? -1 : (v - min) / range)
      .map(v => Math.pow(v, 1/2));

}

class MusicSimilarityRenderer {

  constructor(colors) {
    this.colorDiff = colors.diff;
    this.colorSimilar = colors.similar;
  }

  render(data) {

    if (data.length > 0) {

      const scaled = scale(data);

      const hE = this.colorSimilar[0];
      const hS = this.colorDiff[0];
      const hf = circularTween(hE, hS);

      const sE = this.colorSimilar[1];
      const sS = this.colorDiff[1];
      const sf = linearTween(sE, sS);

      const lE = this.colorSimilar[2];
      const lS = this.colorDiff[2];
      const lf = linearTween(lE, lS);

      const width = Math.sqrt(scaled.length);

      const array = new Uint8ClampedArray(width * width * 4);

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < width; j++) {

          const v = scaled[i * width + j];

          const pos = (i * width + j) * 4;

          let [r,g,b] = hslToRgb(
            hf(v),
            sf(v),
            lf(v)
          );

          if (i === j) {
            r = g = b = 255;
          }

          array[pos    ] = r;
          array[pos + 1] = g;
          array[pos + 2] = b;
          array[pos + 3] = 255;

        }
      }

      return array;
    }
  }
}

function colorTextToRgb(text) {
  const cleaned = text.trim().replace('#', '');

  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  return [r, g, b];
}

onmessage = function({
  data: {
    colors: {
      diff,
      similar
    },
    buffer
  }
}) {

  let colors = [];

  const colorDiffRgb = colorTextToRgb(diff);
  const colorSimilarRgb = colorTextToRgb(similar);

  colors.diff = rgbToHsl(
    colorDiffRgb[0],
    colorDiffRgb[1],
    colorDiffRgb[2]
  );
  colors.similar = rgbToHsl(
    colorSimilarRgb[0],
    colorSimilarRgb[1],
    colorSimilarRgb[2]
  );

  const data = new Float32Array(buffer);

  const renderer = new MusicSimilarityRenderer(colors);

  const render = renderer.render(data);

  const outBuffer = render.buffer;

  postMessage(outBuffer, [outBuffer]);


}
