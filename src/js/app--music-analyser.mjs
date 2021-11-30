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

  updateStatus(status) {
    this.listeners.forEach(l => l(status));
  }

  async generateDiffs(audioFileData, bpm) {

    console.log(`app--music.analyser.mjs - fileDataSize: ${audioFileData.byteLength}, bpm: ${bpm}`)

    const audioData = await this.decodeAudioData(audioFileData);

    const sharedBuffers = convertToSharedBuffers(audioData);
    const sampleRate = audioData.sampleRate;

    const realBpm = await this.calculateBpm(sharedBuffers, bpm);

    const interval = 1000 / (realBpm / 60);

    const fftsForIntervals = await this.calculateFftsForIntervals(sharedBuffers, sampleRate, interval);

    const diffs = await this.calculateFftDiffs(fftsForIntervals);

    return {
      diffs,
      audio: audioData,
      bpm: realBpm
    };
  }

  async decodeAudioData(fileBuffer) {
    this.updateStatus({
      status: 'Decoding audio data'
    });
    const ctx = new AudioContext();
    return await ctx.decodeAudioData(fileBuffer);
  }

  async calculateFftDiffs(ffts) {

    const task = new TaskPromiseWorker('/js/worker--diff-analysis.js');

    this.updateStatus({
      status: 'Calculating difference for chunks',
      task
    });

    const buffers = ffts.map(f => f.buffer);

    const data = await task
      .run(buffers, buffers);

    return new Float32Array(data);
  }

  async calculateFftsForIntervals(buffers, sampleRate, interval) {

    const task = new TaskPromiseWorker('/js/worker--fft.js');

    this.updateStatus({
      status: 'Analysing spectrum for chunks',
      task
    });

    const data = await task
      .run({
        sampleRate,
        interval,
        buffers
      });

    return data.map(f => new Float32Array(f));

  }

  async calculateBpm(buffers, bpm) {

    if (!bpm.autodetect) {
      return bpm.value;
    }

    const task = new TaskPromiseWorker('/js/worker--tempo.js');

    this.updateStatus({
      status: 'Detecting BPM',
      task
    });

    const { tempo } = await task.run(buffers);

    return tempo * bpm.autodetectMultiplier;

  }
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

