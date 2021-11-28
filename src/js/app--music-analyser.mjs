import { TaskPromiseWorker } from './lib--task-promise-worker.mjs';

class MusicAnalyser {
  constructor({
    scale
  }) {
    this.listeners = [];
    this.scale = scale;
  }

  addStatusUpdateListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    } else {
      throw new Error("Listener provided was not a function");
    }
  }

  async generateDiffs(audioFileData, bpm) {

    console.log(`app--music.analyser.mjs - fileDataSize: ${audioFileData.byteLength}, bpm: ${bpm}`)

    const updateStatus = m => this.listeners.forEach(l => l(m))

    updateStatus('Decoding audio data')
    const audioData = await decodeAudioData(audioFileData);

    const sharedBuffers = convertToSharedBuffers(audioData);
    const sampleRate = audioData.sampleRate;

    updateStatus('Detecting BPM')
    const realBpm = await calculateBpm(sharedBuffers, bpm);

    const interval = 1000 / (realBpm / 60);

    updateStatus('Analysing spectrum for chunks');
    const fftsForIntervals = await calculateFftsForIntervals(sharedBuffers, sampleRate, interval);

    updateStatus('Calculating difference for chunks');
    const diffs = await calculateFftDiffs(fftsForIntervals);

    return {
      diffs,
      audio: audioData,
      bpm: realBpm
    };
  }
}

async function decodeAudioData(fileBuffer) {
  const ctx = new AudioContext();
  return await ctx.decodeAudioData(fileBuffer);
}

async function calculateFftDiffs(ffts) {

  const buffers = ffts.map(f => f.buffer);

  const data = await new TaskPromiseWorker('/js/worker--diff-analysis.js')
    .run(buffers, buffers);

  return new Float32Array(data);
}

async function calculateFftsForIntervals(buffers, sampleRate, interval) {

  const data = await new TaskPromiseWorker('/js/worker--fft.js')
    .run({
      sampleRate,
      interval,
      buffers
    });

  return data.map(f => new Float32Array(f));

}


async function calculateBpm(buffers, bpm) {

  if (!bpm.autodetect) {
    return bpm.value;
  }

  const { tempo } = await new TaskPromiseWorker('/js/worker--tempo.js')
    .run(buffers);

  return tempo * bpm.autodetectMultiplier;

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

