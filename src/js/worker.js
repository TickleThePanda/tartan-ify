const ffts = [];

onmessage = function(event) {
  const fft = new Uint8Array(event.data);
 
  ffts.push(fft);

  const results = new Uint8Array(ffts.length * ffts.length);

  for (let i = 0; i < ffts.length; i++) {
    for (let j = 0; j < ffts.length; j++) {
      let diff = 0;
      const left = ffts[i];
      const right = ffts[j];
      for (let k = 0; k < fft.length; k++) {
        diff = diff + Math.abs(left[k] - right[k]);
      }
      results[j * ffts.length + i] = Math.sqrt(diff);
    }
  }

  const buffer = results.buffer;

  postMessage(buffer, [buffer]);

}


