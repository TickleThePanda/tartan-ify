import { CanvasSizeManager } from './view--canvas-size.mjs';
import { AnalysisFormManager } from './view--analysis-form.mjs';
import { SingleVisualisationPainter } from './view--single-vis.mjs';
import { BatchVisualisationPainter } from './view--batch-vis.mjs';
import { MusicAnalyser } from './app--music-analyser.mjs';
import { DiffVisualiser } from './app--diff-visualiser.mjs';
import { StatusManager } from './view--status-manager.mjs';
import { Stage } from './lib--stage.mjs';

window.addEventListener('load', async () => {

  const stage = new Stage();

  const statusManager = new StatusManager({
    wrapper: document.getElementById('loading-status'),
    status: document.getElementById('loading-status-status'),
    task: document.getElementById('loading-status-task'),
    percentage: document.getElementById('loading-status-percentage'),
  }, stage.get.bind(stage));

  const visualiser = document.getElementById('visualiser');
  const batchElement = document.getElementById('batch');
  const canvas = document.getElementById('similarity-graph');
  const context = canvas.getContext('2d');

  const formManager = new AnalysisFormManager(
    document.getElementById('music-form'),
    await loadAudioSelection()
  );

  const canvasSizeManager = new CanvasSizeManager();

  canvasSizeManager.add(canvas);

  formManager.registerSubmitSuccessListener(analyse);

  async function analyse({
    bpm: bpmOption, singleOptions: { scale, thresholds }, batch, loadFileData, colors
  }) {

    console.log("app--main.mjs - Processing data");

    formManager.hide();
    statusManager.start();
    statusManager.visible = true;

    const analyser = new MusicAnalyser({
      scale, thresholds
    });
    const diffVisualiser = new DiffVisualiser({
      colors, context, updateStatus: stage.update.bind(stage)
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
    diffs, thresholds, scale, audio, bpm, colors
  }) {
    const imageData = await diffVisualiser.renderVisualisation({
      diffs, thresholds, scale,
      updateStatus: stage.update.bind(stage)
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
  }) {
    stage.update({
      status: 'Rendering visualisations'
    });

    const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
    const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map(v => v/100);
    const scales = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

    const images = await diffVisualiser.renderVisualisations({
      diffs,
      matrixParams: {
        minThresholds ,
        maxThresholds,
        scales
      }
    });

    statusManager.visible = false;
    batch.classList.remove('hidden');

    startBatchVisualisation(images);

  }

  function playAudio(audio) {
    const ctx = new AudioContext();
    const bufferSrc = new AudioBufferSourceNode(ctx, {
      buffer: audio
    });
    bufferSrc.connect(ctx.destination);
    bufferSrc.start();

  }

  function startSingleVisualisation({
    image, bpm, colors
  }) {
    new SingleVisualisationPainter({
      wrapper: visualiser,
      canvas, context, image, bpm, colors
    }).start();
  }

  function startBatchVisualisation(images) {
    new BatchVisualisationPainter(batchElement, images).start();
  }

  async function loadAudioSelection() {
    const audioResponse = await fetch('/audio/audio.json');
    return await audioResponse.json();
  }

});
