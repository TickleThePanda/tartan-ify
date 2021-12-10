import {
  BatchParamAnalysisOptions,
  ScaleOptions,
} from "../views/analysis-form";
import { BatchVisualisationPainter } from "../views/vis-batch";
import {
  MusicAnalyser,
  DiffVisualiser,
  MatrixParam,
  AudioExtractor,
} from "../processors";
import { MutableStatus } from "../views/status";
import { AnalysisStore } from "../stores/analyis";
import { hashFile } from "./tool--file-hasher";
import { PageManager } from "../views/page-handler";

export class BatchParamsAnalysisHandler {
  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ) {}

  async analyse({
    bpm: bpmOptions,
    colors,
    fileLoader,
  }: BatchParamAnalysisOptions): Promise<void> {
    this.pages.showLoading();

    this.stage.update({
      status: `Loading file`,
    });

    const inputFile = await fileLoader();

    const uploadHash = await hashFile(inputFile.data);

    const matrixParams = generateParams();

    const cachedImages = await Promise.all(
      matrixParams.map(async (p) => {
        const cachedImage = await this.cache.get({
          ...p,
          bpmOptions,
          diffColor: colors.diff,
          similarColor: colors.similar,
          trackHash: uploadHash,
        });
        return {
          imageData: cachedImage?.image,
          context: p,
        };
      })
    );

    type ImageWithContext = {
      imageData: Uint8ClampedArray;
      context: MatrixParam;
    };

    const foundImages: ImageWithContext[] = await Promise.all(
      cachedImages
        .filter((i) => i.imageData !== undefined)
        .map(async ({ imageData, context }) => ({
          imageData: new Uint8ClampedArray(
            <ArrayBuffer>await imageData?.arrayBuffer()
          ),
          context,
        }))
    );

    let allImages: ImageWithContext[] = [];

    if (foundImages.length === matrixParams.length) {
      allImages = foundImages;

      this.stage.update({
        status: "Updating access time for cached images",
      });
    } else {
      const track = await this.audioExtractor.extract(
        inputFile.data,
        inputFile.name
      );

      const bpm = await this.analyser.calculateBpm({
        hash: uploadHash,
        ...track,
        bpm: bpmOptions,
      });

      const diffs = await this.analyser.calculateDiffMatrix({
        ...track,
        bpm,
      });

      const paramsOfMissingImages = cachedImages
        .filter((i) => i.imageData === undefined)
        .map((i) => i.context);

      const newlyCreatedImages = await this.diffVisualiser.renderVisualisations(
        {
          diffs,
          matrixParams: paramsOfMissingImages,
          colors,
        }
      );

      this.stage.update({
        status: "Caching images",
      });

      for (const image of newlyCreatedImages) {
        await this.cache.store(
          {
            ...image.context,
            bpmOptions,
            trackHash: uploadHash,
            diffColor: colors.diff,
            similarColor: colors.similar,
          },
          {
            image: new Blob([image.imageData]),
            trackName: track.name,
          }
        );
      }

      allImages = [...foundImages, ...newlyCreatedImages];
    }

    this.pages.showVisualisation(this.visPainter);
    this.visPainter.start(
      allImages.map((i) => ({
        title: `${i.context.scale}, ${i.context.minThreshold}, ${i.context.maxThreshold}`,
        imageData: i.imageData,
      })),
      "Batch parameters"
    );
  }
}

function generateParams() {
  const minThresholds = [0, 0.1, 1, 10].map((v) => v / 100);
  const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map((v) => v / 100);
  const scales: ScaleOptions[] = [
    "log",
    "sqrt",
    "linear",
    "squared",
    "exponential",
  ];

  const paramSets = [];

  for (const minThreshold of minThresholds) {
    for (const maxThreshold of maxThresholds) {
      for (const scale of scales) {
        paramSets.push({
          minThreshold,
          maxThreshold,
          scale,
        });
      }
    }
  }

  return paramSets;
}
