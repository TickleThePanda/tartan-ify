const results = [];
const ffts = [];

onmessage = function(event) {
  if (event.data instanceof String) {
    if (event.data === 'trigger') {
      const buffer = convertResultsToArray().buffer;

      postMessage(buffer, [buffer]);
      
    }
  } else {
    const fft = new Uint8Array(event.data);
   
    ffts.push(fft);

    const current = ffts.length - 1;

    results[current] = [];
    for (let i = 0; i < ffts.length; i++) {
      let diff = 0;
      const left = fft;
      const right = ffts[i];
      for (let k = 0; k < fft.length; k++) {
        diff = diff + Math.abs(left[k] - right[k]);
      }

      const v = Math.sqrt(diff);

      results[current][i] = v;
      results[i][current] = v;
    }

    const buffer = convertResultsToArray().buffer;

    postMessage(buffer, [buffer]);

  }

}

function convertResultsToArray() {
  
  const data = new Uint32Array(ffts.length * ffts.length);

  for (let i = 0; i < ffts.length; i++) {
    for (let j = 0; j < ffts.length; j++) {
      data[j * ffts.length + i] = results[i][j];
    }
  }
  
  return data;
}
