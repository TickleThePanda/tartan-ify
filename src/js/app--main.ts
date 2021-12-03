import { CanvasSizeManager } from './view--canvas-size.js';
import { AnalysisFormManager, AnalysisOptions, ScaleOptions, ThresholdOptions, VisualisationColors } from './view--analysis-form.js';
import { SingleVisualisationPainter } from './view--vis-single.js';
import { BatchImage, BatchVisualisationPainter } from './view--vis-batch.js';
import { MusicAnalyser } from './app--music-analyser.js';
import { DiffVisualiser } from './app--diff-visualiser.js';
import { StatusView } from './view--status.js';
import { MutableStatus } from './lib--mutable-status.js';

window.addEventListener('load', async () => {

  const stage = new MutableStatus();

  const statusManager = new StatusView({
    wrapper: document.getElementById('loading-status'),
    status: document.getElementById('loading-status-status'),
    task: document.getElementById('loading-status-task'),
    percentage: document.getElementById('loading-status-percentage'),
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

  formManager.registerSubmitSuccessListener(analyse);

  async function analyse({
    bpm: bpmOption,
    singleOptions: { scale, thresholds },
    batch,
    loadFileData,
    colors
  }: AnalysisOptions) {

    console.log("app--main.mjs - Processing data");

    formManager.hide();
    statusManager.start();
    statusManager.visible = true;

    const analyser = new MusicAnalyser({
      scale
    });
    const diffVisualiser = new DiffVisualiser({
      colors, context, status: stage
    })

    stage.update({
      status: 'Loading file'
    });
    analyser.addStatusUpdateListener(stage.update.bind(stage));

    const audioFileData = await loadFileData();
    let audio, diffs, realBpm;

    try {
      ({ audio, diffs, bpm: realBpm } = await analyser.generateDiffMatrix(audioFileData, bpmOption));

      if (!batch) {
        renderSingleVisualisation({
          diffVisualiser,
          diffs, thresholds, scale, audio, bpm: realBpm,
          colors
        });
      } else {
        renderBatchVisualisation({
          diffVisualiser,
          diffs
        })
      }

    } catch (e) {
      stage.updateError(`There was a problem generating the visualisation.<br>${e}`);
      return;
    }

  };

  async function renderSingleVisualisation({
    diffVisualiser,
    diffs,
    thresholds, scale, audio, bpm, colors
  }: {
    diffVisualiser: DiffVisualiser,
    diffs: Float32Array,
    thresholds: ThresholdOptions
    scale: ScaleOptions,
    audio: AudioBuffer,
    bpm: number,
    colors: VisualisationColors
  }) {
    const imageData = await diffVisualiser.renderVisualisation({
      diffs, thresholds, scale
    });
    visualiser.classList.remove('hidden');
    canvasSizeManager.triggerResize();
    statusManager.visible = false;
    statusManager.stop();
    playAudio(audio);
    startSingleVisualisation({
      image: imageData, bpm, colors
    });
  }

  async function renderBatchVisualisation({
    diffVisualiser,
    diffs
  }: {
    diffVisualiser: DiffVisualiser,
    diffs: Float32Array
  }) {
    stage.update({
      status: 'Rendering visualisations'
    });

    const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
    const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map(v => v/100);
    const scales: ScaleOptions[] = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

    const images = await diffVisualiser.renderVisualisations({
      diffs,
      matrixParams: {
        minThresholds ,
        maxThresholds,
        scales
      }
    });

    statusManager.visible = false;
    batchElement.classList.remove('hidden');

    startBatchVisualisation(images);
  }

  function playAudio(audio: AudioBuffer) {
    const ctx = new AudioContext();
    const bufferSrc = new AudioBufferSourceNode(ctx, {
      buffer: audio
    });
    bufferSrc.connect(ctx.destination);
    bufferSrc.start();

  }

  function startSingleVisualisation({
    image, bpm, colors
  }: {
    image: ImageBitmap,
    bpm: number,
    colors: VisualisationColors
  }) {
    new SingleVisualisationPainter({
      wrapper: visualiser,
      canvas, context, image, bpm, colors
    }).start();
  }

  function startBatchVisualisation(images: BatchImage[]) {
    const batchVisualiser = new BatchVisualisationPainter(batchElement, images);
    batchVisualiser.start();
  }

  async function loadAudioSelection() {
    const audioResponse = await fetch('/audio/audio.json');
    return await audioResponse.json();
  }

});
