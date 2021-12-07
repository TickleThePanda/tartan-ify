import { CanvasSizeManager } from './view--canvas-size.js';
import { AnalysisFormManager, BatchFileAnalysisOptions, BatchParamAnalysisOptions, ScaleOptions, SingleAnalysisOptions, ThresholdOptions, VisualisationColors } from './view--analysis-form.js';
import { SingleVisualisationPainter } from './view--vis-single.js';
import { BatchImage, BatchVisualisationPainter } from './view--vis-batch.js';
import { MusicAnalyser } from './app--music-analyser.js';
import { DiffVisualiser } from './app--diff-visualiser.js';
import { StatusView } from './view--status.js';
import { MutableStatus } from './lib--mutable-status.js';
import { VisView } from './view--vis-view.js';

window.addEventListener('load', async () => {

  const stage = new MutableStatus();

  const statusManager = new StatusView({
    wrapper: document.getElementById('loading-status'),
    status: document.getElementById('loading-status-status'),
    task: document.getElementById('loading-status-task'),
    percentage: document.getElementById('loading-status-percentage'),
    context: document.getElementById('loading-status-context'),
  }, stage.get.bind(stage));

  const visualiser = document.getElementById('visualiser');
  const batchElement = document.getElementById('batch');
  const canvas = <HTMLCanvasElement> document.getElementById('similarity-graph');
  const context = canvas.getContext('2d');

  const formManager = new AnalysisFormManager(
    document.getElementById('music-form'),
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
  const musicAnalyser = new MusicAnalyser();
  musicAnalyser.addStatusUpdateListener(args => stage.update(args));

  const pageManager = new PageManager(
    formManager,
    statusManager
  );

  const singleAnalysisHandler = new SingleAnalysisHandler(
    pageManager,
    singleVisPainter,
    stage,
    diffVisualiser,
    musicAnalyser
  );
  const batchFileAnalysisHandler = new BatchFileAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser
  );
  const batchParamsAnalysisHandler = new BatchParamsAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser
  );

  function logErrors<A>(f: (v: A) => any) : (v: A) => Promise<any> {
    return async (v) => {
      try {
        return await f(v);
      } catch (e) {
        console.log(e);
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
    private analyser: MusicAnalyser
  ){}

  async analyse({
    bpm: bpmOption,
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

    const { audio, diffs, bpm: realBpm } = await this.analyser.generateDiffMatrix(file.data, bpmOption)

    const imageData = await this.diffVisualiser.renderVisualisation({
      diffs, thresholds, scale, colors
    });

    this.pages.showVisualisation(this.visPainter);

    playAudio(audio);

    this.visPainter.start({
      image: imageData, bpm: realBpm, colors
    });

  }
}


class BatchFileAnalysisHandler {

  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private diffVisualiser: DiffVisualiser,
    private analyser: MusicAnalyser
  ){}

  async analyse({
    bpm: bpmOption,
    scale,
    thresholds,
    fileLoaders,
    colors
  }: BatchFileAnalysisOptions): Promise<void> {

    this.pages.showLoading();

    let images: BatchImage[] = [];

    let currentTrack = 1;

    for (const loader of fileLoaders) {

      this.stage.updateContext(null);

      this.stage.update({
        status: `Loading file`
      });

      const inputFile = await loader();

      this.stage.updateContext(`${currentTrack++}/${fileLoaders.length}: ${inputFile.name}`);

      const { diffs } = await this.analyser.generateDiffMatrix(inputFile.data, bpmOption);

      const imageData = await this.diffVisualiser.renderVisualisation({
        diffs, thresholds, scale, colors
      });

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
    private analyser: MusicAnalyser
  ){}

  async analyse({
    bpm: bpmOption,
    colors,
    fileLoader
  }: BatchParamAnalysisOptions): Promise<void> {

    this.pages.showLoading();

    this.stage.update({
      status: `Loading file`
    });

    const inputFile = await fileLoader();

    const { diffs } = await this.analyser.generateDiffMatrix(inputFile.data, bpmOption);

    const images = await this.diffVisualiser.renderVisualisations({
      diffs,
      matrixParams: generateParams(),
      colors
    });

    this.pages.showVisualisation(this.visPainter);
    this.visPainter.start(images);
  }

}

function generateParams() {
  const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
  const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map(v => v/100);
  const scales: ScaleOptions[] = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

  return {
    minThresholds,
    maxThresholds,
    scales
  };
}

function playAudio(audio: AudioBuffer) {
  const ctx = new AudioContext();
  const bufferSrc = new AudioBufferSourceNode(ctx, {
    buffer: audio
  });
  bufferSrc.connect(ctx.destination);
  bufferSrc.start();

}
