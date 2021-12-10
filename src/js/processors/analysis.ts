import { Track } from "./audio-extractor";
import { BpmCache } from "../stores";
import { MutableStatus } from "../views/status";
import { TaskPromiseWorker } from "./tool--task-promise-worker";
import { BpmOptions } from "../views/analysis-form";

class MusicAnalyser {
  #status: MutableStatus;
  #bpmCache: BpmCache = new BpmCache({
    version: "v1",
  });

  constructor(status: MutableStatus) {
    this.#status = status;
    this.#bpmCache;
  }

  async bpm({
    pcm,
    hash,
    bpm,
  }: Track & {
    hash: string;
    bpm: BpmOptions;
  }): Promise<number> {
    console.log(
      `app--music.analyser.mjs - fileDataSize: ${pcm.byteLength}, bpm: ${bpm}`
    );

    return await this.calculateBpm({
      pcm,
      bpm,
      hash,
    });
  }

  async calculateDiffMatrix({
    pcm,
    sampleRate,
    bpm,
  }: Track & { bpm: number }): Promise<Float32Array> {
    const interval = 1000 / (bpm / 60);

    const fftsForIntervals = await this.calculateFftsForSegments(
      pcm,
      sampleRate,
      interval
    );

    const diffs = await this.calculateFftDiffMatrix(fftsForIntervals);

    return diffs;
  }

  async calculateFftDiffMatrix(ffts: Float32Array[]) {
    const task = new TaskPromiseWorker("/js/workers/w--diff-analysis.js");

    this.#status.update({
      status: "Calculating differences between segments",
      task,
    });

    const buffers = ffts.map((f) => f.buffer);

    const data = await task.run(buffers, buffers);

    return new Float32Array(data);
  }

  async calculateFftsForSegments(
    pcm: SharedArrayBuffer,
    sampleRate: number,
    interval: number
  ): Promise<Float32Array[]> {
    const task = new TaskPromiseWorker("/js/workers/w--fft.js");

    this.#status.update({
      status: "Analysing spectrum for each segments",
      task,
    });

    const data: ArrayBuffer[] = await task.run({
      sampleRate,
      interval,
      pcm,
    });

    return data.map((f) => new Float32Array(f));
  }

  async calculateBpm({
    pcm,
    bpm,
    hash,
  }: {
    pcm: SharedArrayBuffer;
    bpm: BpmOptions;
    hash: string;
  }): Promise<number> {
    if (!bpm.autodetect) {
      return bpm.value;
    }

    const storedBpm = this.#bpmCache.get(hash);
    if (storedBpm !== null) {
      return storedBpm * bpm.autodetectMultiplier;
    }

    const task = new TaskPromiseWorker("/js/workers/w--tempo.js");

    this.#status.update({
      status: "Detecting BPM",
      task,
    });

    try {
      const { tempo }: { tempo: number } = await task.run(pcm);

      this.#bpmCache.set(hash, tempo);
      return tempo * bpm.autodetectMultiplier;
    } catch (e) {
      if (
        typeof e === "string" &&
        e.startsWith("Error: Tempo extraction failed")
      ) {
        const tempo = 113;

        this.#bpmCache.set(hash, tempo);
        return tempo * bpm.autodetectMultiplier;
      } else {
        throw e;
      }
    }
  }
}

export { MusicAnalyser };
