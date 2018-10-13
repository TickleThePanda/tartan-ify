const results = [];
const ffts = [];

onmessage = function(event) {
  const fft = event.data;
 
  ffts.push(fft);

  for(let i = 0; i < ffts.length; i++) {
    results[i] = [];
    for(let j = 0; j < ffts.length; j++) {
      let sum = 0;
      const left = ffts[i];
      const right = ffts[j];
      for(let k = 0; k < fft.length; k++) {
        sum = sum + Math.abs(left[k] - right[k]);
      }
      results[i][j] = Math.sqrt(sum);
    }
  }

  postMessage(results);

}


