import { CanvasSizeManager } from './view--canvas-size';
import { AnalysisFormManager, BatchFileAnalysisOptions, BatchParamAnalysisOptions, ScaleOptions, SingleAnalysisOptions, ThresholdOptions, VisualisationColors } from './view--analysis-form';
import { SingleVisualisationPainter } from './view--vis-single';
import { BatchImage, BatchVisualisationPainter } from './view--vis-batch';
import { MusicAnalyser } from './app--music-analyser';
import { DiffVisualiser, MatrixParam } from './app--diff-visualiser';
import { StatusView } from './view--status';
import { MutableStatus } from './lib--mutable-status';
import { VisView } from './view--vis-view';
import { AudioExtractor } from './app--audio-extractor';
import { AnalysisStore } from './lib--analyis-cache';

function requiredElementById(element: string): HTMLElement {
  return document.getElementById(element) ?? (() => {throw new Error("Required element " + element)})();
}

window.addEventListener('load', async () => {

  const stage = new MutableStatus();

  const statusManager = new StatusView({
    wrapper: requiredElementById('loading-status'),
    status: requiredElementById('loading-status-status'),
    task: requiredElementById('loading-status-task'),
    percentage: requiredElementById('loading-status-percentage'),
    context: requiredElementById('loading-status-context'),
  }, stage);

  const visualiser = requiredElementById('visualiser');
  const batchElement = requiredElementById('batch');
  const canvas = <HTMLCanvasElement> requiredElementById('similarity-graph');
  const context = canvas.getContext('2d') ?? (() => {throw new Error("Unable to get context")})();

  const formManager = new AnalysisFormManager(
    requiredElementById('music-form'),
    await loadAudioSelection()
  );

  const canvasSizeManager = new CanvasSizeManager();
  canvasSizeManager.add(canvas);


  const diffVisualiser = new DiffVisualiser({
    context: context,
    status: stage
  });

  const singleVisPainter = new SingleVisualisationPainter({
    wrapper: visualiser,
    canvas,
    context,
    canvasSizeManager
  });

  const batchVisualiserPainter =  new BatchVisualisationPainter(batchElement);
  const audioExtractor = new AudioExtractor(stage);
  const musicAnalyser = new MusicAnalyser(stage);
  const cache = new AnalysisStore();

  const pageManager = new PageManager(
    formManager,
    statusManager
  );

  const singleAnalysisHandler = new SingleAnalysisHandler(
    pageManager,
    singleVisPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );
  const batchFileAnalysisHandler = new BatchFileAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );
  const batchParamsAnalysisHandler = new BatchParamsAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );

  function logErrors<A>(f: (v: A) => any) : (v: A) => Promise<any> {
    return async (v) => {
      try {
        return await f(v);
      } catch (e: any) {
        console.log(e, e.stack ?? "No stack trace");
      }

    }
  }

  formManager.registerSingleSubmitListener(
    logErrors(
      (args) => singleAnalysisHandler.analyse(args)
    )
   );
  formManager.registerBatchFileSubmitListener(
    logErrors(
      (args) => batchFileAnalysisHandler.analyse(args)
    )
  );
  formManager.registerBatchParamSubmitListener(
    logErrors(
      (args) => batchParamsAnalysisHandler.analyse(args)
    )
  );

  async function loadAudioSelection() {
    const audioResponse = await fetch('/audio/audio.json');
    return await audioResponse.json();
  }

});

class PageManager {
  constructor(
    private formManager: AnalysisFormManager,
    private statusManager: StatusView
  ) {}

  showLoading() {
    this.formManager.hide();
    this.statusManager.start();
    this.statusManager.visible = true;
  }

  showVisualisation(vis: VisView) {
    this.statusManager.stop();
    this.statusManager.visible = false;
    vis.show();
  }
}

class SingleAnalysisHandler {

  constructor(
    private pages: PageManager,
    private visPainter: SingleVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ){}

  async analyse({
    bpm: bpmOptions,
    scale,
    thresholds,
    fileLoader,
    colors
  }: SingleAnalysisOptions) {

    this.pages.showLoading();

    this.stage.update({
      status: `Loading file`
    });

    const file = await fileLoader();

    const uploadHash = await hashFile(file.data);

    const track = await this.audioExtractor.extract(file.data, file.name);

    const bpm = await this.analyser.calculateBpm({
      hash: uploadHash,
      ...track,
      bpm: bpmOptions
    });

    const { image: imageData } = await this.cache.computeIfAbsent({
        minThreshold: thresholds.min,
        maxThreshold: thresholds.max,
        scale,
        similarColor: colors.similar,
        diffColor: colors.diff,
        trackHash: uploadHash,
        bpmOptions
      }, async () => {

        const diffs = await this.analyser.calculateDiffMatrix({
          ...track,
          bpm
        })

        return await this.diffVisualiser.renderVisualisation({
          diffs, thresholds, scale, colors
        });
      }
    );


    this.pages.showVisualisation(this.visPainter);

    playAudio(track.audioBuffer);

    this.visPainter.start({
      image: imageData, bpm, colors
    });

  }
}


class BatchFileAnalysisHandler {

  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ){}

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
          })

          return await this.diffVisualiser.renderVisualisation({
            diffs, thresholds, scale, colors
          });
        }
      );

      images.push({
        title: inputFile.name,
        imageData
      });

    };

    this.pages.showVisualisation(this.visPainter);

    this.visPainter.start(images);

  }

}

class BatchParamsAnalysisHandler {

  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser,
    private audioExtractor: AudioExtractor,
    private cache: AnalysisStore
  ){}

  async analyse({
    bpm: bpmOptions,
    colors,
    fileLoader
  }: BatchParamAnalysisOptions): Promise<void> {

    this.pages.showLoading();

    this.stage.update({
      status: `Loading file`
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
          trackHash: uploadHash
        })
        return {
          imageData: cachedImage?.image,
          context: p
        }
      })
    );

    type ImageWithContext = {
      imageData: Uint8ClampedArray,
      context: MatrixParam,
    };

    const foundImages: ImageWithContext[] = <ImageWithContext[]> cachedImages
      .filter(i => i.imageData !== undefined);

    let allImages: ImageWithContext[] = [];

    if (foundImages.length === matrixParams.length) {
      allImages = foundImages;
    } else {

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

      const paramsOfMissingImages = cachedImages
        .filter(i => i.imageData === undefined)
        .map(i => i.context)

      const newlyCreatedImages = await this.diffVisualiser.renderVisualisations({
        diffs,
        matrixParams: paramsOfMissingImages,
        colors
      });

      for (const image of newlyCreatedImages) {
        await this.cache.store({
          ...image.context,
          bpmOptions,
          trackHash: uploadHash,
          diffColor: colors.diff,
          similarColor: colors.similar
        }, image.imageData);
      }

      allImages = [...foundImages, ...newlyCreatedImages];

    }

    this.pages.showVisualisation(this.visPainter);
    this.visPainter.start(
      allImages.map(i => ({
        title: `${i.context.scale}, ${i.context.minThreshold}, ${i.context.maxThreshold}`,
        imageData: i.imageData
      }))
    );
  }

}

function generateParams() {
  const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
  const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map(v => v/100);
  const scales: ScaleOptions[] = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

  const paramSets = [];

  for (const minThreshold of minThresholds) {
    for (const maxThreshold of maxThresholds) {
      for (const scale of scales) {
        paramSets.push({
          minThreshold,
          maxThreshold,
          scale
        });
      }
    }
  }

  return paramSets;
}

function playAudio(audio: AudioBuffer) {
  const ctx = new AudioContext();
  const bufferSrc = new AudioBufferSourceNode(ctx, {
    buffer: audio
  });
  bufferSrc.connect(ctx.destination);
  bufferSrc.start();

}



async function hashFile(pcm: ArrayBuffer): Promise<string> {

  const copy = new ArrayBuffer(pcm.byteLength);
  new Uint8Array(copy).set(new Uint8Array(pcm));

  const hashBuffer = await crypto.subtle.digest("SHA-1", copy);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash;
}
