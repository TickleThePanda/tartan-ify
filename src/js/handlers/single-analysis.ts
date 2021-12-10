import { SingleAnalysisOptions } from "../views/analysis-form";
import { SingleVisualisationPainter } from "../views/vis-single";
import { MusicAnalyser } from "../processors/analysis";
import { DiffVisualiser } from "../processors/visualiser";
import { MutableStatus } from "../views/status";
import { AudioExtractor } from "../processors/audio-extractor";
import { AnalysisStore } from "../stores/analyis";
import { hashFile } from "./tool--file-hasher";
import { PageManager } from "../views/page-handler";

export class SingleAnalysisHandler {
  constructor(
    private pages: PageManager,
    private visPainter: SingleVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ) {}

  async analyse({
    bpm: bpmOptions,
    scale,
    thresholds,
    fileLoader,
    colors,
  }: SingleAnalysisOptions) {
    this.pages.showLoading();

    this.stage.update({
      status: `Loading file`,
    });

    const file = await fileLoader();

    const uploadHash = await hashFile(file.data);

    const track = await this.audioExtractor.extract(file.data, file.name);

    const bpm = await this.analyser.calculateBpm({
      hash: uploadHash,
      ...track,
      bpm: bpmOptions,
    });

    const { image: imageData } = await this.cache.computeIfAbsent(
      {
        minThreshold: thresholds.min,
        maxThreshold: thresholds.max,
        scale,
        similarColor: colors.similar,
        diffColor: colors.diff,
        trackHash: uploadHash,
        bpmOptions,
      },
      async () => {
        const diffs = await this.analyser.calculateDiffMatrix({
          ...track,
          bpm,
        });

        return {
          image: new Blob([
            await this.diffVisualiser.renderVisualisation({
              diffs,
              thresholds,
              scale,
              colors,
            }),
          ]),
          trackName: track.name,
        };
      }
    );

    this.pages.showVisualisation(this.visPainter);

    playAudio(track.audioBuffer);

    this.visPainter.start({
      image: new Uint8ClampedArray(await imageData.arrayBuffer()),
      bpm,
      colors,
    });
  }
}

export function playAudio(audio: AudioBuffer) {
  const ctx = new AudioContext();
  const bufferSrc = new AudioBufferSourceNode(ctx, {
    buffer: audio,
  });
  bufferSrc.connect(ctx.destination);
  bufferSrc.start();
}
