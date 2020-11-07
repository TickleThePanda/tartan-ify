class MusicAnalyser {
  constructor(colors, context) {
    this.listeners = [];
    this.colors = colors;
    this.context = context;
  }

  addStatusUpdateListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    } else {
      throw new Error("Listener provided was not a function");
    }
  }

  async processData(audioFileData, interval) {

    const updateStatus = m => this.listeners.forEach(l => l(m))

    updateStatus('Decoding audio data')
    const audioData = await decodeAudioData(audioFileData);

    updateStatus('Calculating frequency data');
    const fftsForIntervals = await calculateFftsForIntervals(audioData, interval);

    updateStatus('Calculating differences');
    const diffs = await calculateFftDiffs(fftsForIntervals);

    updateStatus('Rendering visualisation');
    const bmp = await renderImageFromDiffs(diffs, this.colors, this.context);

    return {
      image: bmp,
      audio: audioData
    };
  }
}

async function decodeAudioData(fileBuffer) {
  const ctx = new AudioContext();
  return await ctx.decodeAudioData(fileBuffer);
}

async function renderImageFromDiffs(ffts, colors, context) {
  return new Promise(function(resolve, reject) {
    const rendererWorker = new Worker('/js/worker--renderer.js');

    rendererWorker.onmessage = async event => {
      const array = new Uint8ClampedArray(event.data);

      const wFromRenderer = Math.sqrt(array.length / 4);

      const image = context.createImageData(wFromRenderer, wFromRenderer);

      image.data.set(array);

      const bmp = await createImageBitmap(image, 0, 0, wFromRenderer, wFromRenderer);

      rendererWorker.terminate();

      resolve(bmp);
    };

    const buffer = ffts.buffer;

    rendererWorker.postMessage({
        buffer,
        colors
      },
      [buffer]
    );

  });
}

async function calculateFftDiffs(ffts) {
  return new Promise(function(resolve, reject) {
    const diffAnalyserWorker = new Worker('/js/worker--diff-analysis.js');

    const buffers = ffts.map(f => f.buffer);

    diffAnalyserWorker.onmessage = function(message) {
      resolve(new Float32Array(message.data));
      diffAnalyserWorker.terminate();
    }

    diffAnalyserWorker.postMessage(buffers, buffers);

  });
}

async function calculateFftsForIntervals(audioData, interval) {

  return new Promise(function(resolve, reject) {
    const fftWorker = new Worker('/js/worker--fft.js');

    const buffers = [];

    for (let i = 0; i < audioData.numberOfChannels; i++) {
      buffers.push(audioData.getChannelData(i).buffer);
    }

    fftWorker.onmessage = function(message) {
      resolve(message.data.map(f => new Float32Array(f)));
      fftWorker.terminate();
    }

    fftWorker.postMessage({
      sampleRate: audioData.sampleRate,
      interval: interval,
      buffers: buffers
    });

  });

}


export { MusicAnalyser };