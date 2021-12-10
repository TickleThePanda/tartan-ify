import { BatchFileAnalysisOptions } from '../views/analysis-form';
import { BatchImage, BatchVisualisationPainter } from '../views/vis-batch';
import { MusicAnalyser } from '../processors/analysis';
import { DiffVisualiser } from '../processors/visualiser';
import { MutableStatus } from '../views/status';
import { AudioExtractor } from '../processors/audio-extractor';
import { AnalysisStore } from '../stores/analyis';
import { hashFile } from "./tool--file-hasher";
import { PageManager } from "../views/page-handler";

export class BatchFileAnalysisHandler {

  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ) { }

  async analyse({
    bpm: bpmOptions,
    scale,
    thresholds,
    fileLoaders,
    colors
  }: BatchFileAnalysisOptions): Promise<void> {

    this.pages.showLoading();

    let images: BatchImage[] = [];

    let currentTrack = 1;

    for (const loader of fileLoaders) {

      this.stage.updateContext(undefined);

      this.stage.update({
        status: `Loading file`
      });

      const inputFile = await loader();

      const uploadHash = await hashFile(inputFile.data);

      this.stage.updateContext(`${currentTrack++}/${fileLoaders.length}: ${inputFile.name}`);

      const { image: imageData } = await this.cache.computeIfAbsent({
        minThreshold: thresholds.min,
        maxThreshold: thresholds.max,
        scale,
        similarColor: colors.similar,
        diffColor: colors.diff,
        trackHash: uploadHash,
        bpmOptions
      }, async () => {

        const track = await this.audioExtractor.extract(inputFile.data, inputFile.name);

        const bpm = await this.analyser.calculateBpm({
          hash: uploadHash,
          ...track,
          bpm: bpmOptions
        });
        const diffs = await this.analyser.calculateDiffMatrix({
          ...track,
          bpm
        });

        return {
          image: new Blob([
            await this.diffVisualiser.renderVisualisation({
              diffs, thresholds, scale, colors
            })
          ]),
          trackName: track.name
        };
      }
      );

      images.push({
        title: inputFile.name,
        imageData: new Uint8ClampedArray(await imageData.arrayBuffer())
      });

    };

    this.pages.showVisualisation(this.visPainter);

    this.visPainter.start(images, "Batch files");

  }
}
