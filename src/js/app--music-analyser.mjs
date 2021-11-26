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

  async processData(audioFileData, bpm) {

    console.log(`app--music.analyser.mjs - fileDataSize: ${audioFileData.byteLength}, bpm: ${bpm}`)

    const updateStatus = m => this.listeners.forEach(l => l(m))

    updateStatus('Decoding audio data')
    const audioData = await decodeAudioData(audioFileData);

    const sharedBuffers = convertToSharedBuffers(audioData);
    const sampleRate = audioData.sampleRate;

    updateStatus('Calculating BPM')
    const realBpm = Math.floor(await calculateBpm(sharedBuffers, bpm));

    const interval = 1000 / (realBpm / 60);

    updateStatus('Calculating frequency data');
    const fftsForIntervals = await calculateFftsForIntervals(sharedBuffers, sampleRate, interval);

    updateStatus('Calculating differences');
    const diffs = await calculateFftDiffs(fftsForIntervals);

    updateStatus('Rendering visualisation');
    const bmp = await renderImageFromDiffs(diffs, this.colors, this.context);

    return {
      image: bmp,
      audio: audioData,
      bpm: realBpm
    };
  }
}

async function decodeAudioData(fileBuffer) {
  const ctx = new AudioContext();
  return await ctx.decodeAudioData(fileBuffer);
}

async function renderImageFromDiffs(ffts, colors, context) {

  const data = await new OneTimeTaskWorker('/js/worker--renderer.js')
    .run({
        buffer: ffts.buffer,
        colors
      },
      [ffts.buffer]
    );

  const array = new Uint8ClampedArray(data);

  const widthFromRender = Math.sqrt(array.length / 4);

  const image = context.createImageData(widthFromRender, widthFromRender);

  image.data.set(array);

  const bmp = await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender);

  return bmp;
}

async function calculateFftDiffs(ffts) {

  const buffers = ffts.map(f => f.buffer);

  const data = await new OneTimeTaskWorker('/js/worker--diff-analysis.js')
    .run(buffers, buffers);

  return new Float32Array(data);
}

async function calculateFftsForIntervals(buffers, sampleRate, interval) {

  const data = await new OneTimeTaskWorker('/js/worker--fft.js')
    .run({
      sampleRate,
      interval,
      buffers
    });

  return data.map(f => new Float32Array(f));

}


async function calculateBpm(buffers, bpm) {

  if (bpm !== 'autodetect') {
    return bpm;
  }

  const { tempo } = await new OneTimeTaskWorker('/js/worker--tempo.js')
    .run(buffers);

  return tempo;

}

function convertToSharedBuffers(audioData) {
  const buffers = [];

  for (let i = 0; i < audioData.numberOfChannels; i++) {
    const buffer = audioData.getChannelData(i).buffer;
    buffers.push(copyToSharedBuffer(buffer));
  }

  return buffers;
}

function copyToSharedBuffer(src)  {
  const dst = new SharedArrayBuffer(src.byteLength);
  new Uint8Array(dst).set(new Uint8Array(src));
  return dst;
}


export { MusicAnalyser };

class OneTimeTaskWorker {
  constructor(stringUrl) {
    this.stringUrl = stringUrl;
  }

  async run(message, transfer) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.stringUrl);
      worker.onmessage = m => {
        resolve(m.data);
        worker.terminate();
      }
      worker.postMessage(message, transfer);
    });
  }
}
