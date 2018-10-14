const results = [];
const ffts = [];

let lastLength = 0;

onmessage = function(event) {
  const fft = event.data;

  const thisLength = lastLength;

  ffts.push(fft);

  lastLength += 1;

  const currentFft = fft;

  results[thisLength] = [];
  for (let i = 0; i < ffts.length; i++) {
    let diff = 0;
    let amp = 0;
    const left = currentFft;
    const right = ffts[i];
    for (let k = 0; k < fft.length; k++) {
      diff += Math.abs(left[k] - right[k]);
      amp += left[k] - right[k];
    }

    results[thisLength][i] = {
      diff: Math.sqrt(diff),
      amp: amp
    };

    results[i][thisLength] = {
      diff: Math.sqrt(diff),
      amp: amp
    };
  }

  postMessage(results);

}


