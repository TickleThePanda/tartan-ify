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

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

class MusicSimilarityRenderer {

  constructor(colors) {
    this.colorDiff = colors.diff;
    this.colorSimilar = colors.similar;
  }
  
  render(data) {

    if (data.length > 0) {

      const hE = this.colorSimilar[0];
      const hS = this.colorDiff[0];

      const sE = this.colorSimilar[1];
      const sS = this.colorDiff[1];

      const lE = this.colorSimilar[2];
      const lS = this.colorDiff[2];

      const max = data
          .reduce((a, b) => Math.max(a, b));

      const min = data
          .filter(a => a != 0)
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

      const range = max - min;

      const width = Math.sqrt(data.length);

      const array = new Uint8ClampedArray(width * width * 4);

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < width; j++) {

          const v = data[j * width + i];

          const pos = (j * width + i) * 4;
          
          const norm = (v - min) / range;

          const h = hE + norm * (hS - hE);
          const s = sE + norm * (sS - sE);
          const l = lE + norm * (lS - lE);

          const rgb = hslToRgb(h, s, l);

          if (v === 0) {
            rgb[0] = 255;
            rgb[1] = 255;
            rgb[2] = 255;
          }

          array[pos    ] = rgb[0];
          array[pos + 1] = rgb[1];
          array[pos + 2] = rgb[2];
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

let colors = {};

onmessage = function(message) {

  if (!(message.data instanceof ArrayBuffer)) {

    const colorDiffRgb = colorTextToRgb(message.data.diff); 
    const colorSimilarRgb = colorTextToRgb(message.data.similar);

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
  } else {

    const buffer = message.data;

    const data = new Uint32Array(buffer);

    const renderer = new MusicSimilarityRenderer(colors);

    const render = renderer.render(data);

    const outBuffer = render.buffer;

    postMessage(outBuffer, [outBuffer]);

  }

}

