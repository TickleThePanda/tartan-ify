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

  const loadingStatus = document.getElementById('loading-status');
  const statusManager = new StatusManager(loadingStatus, stage.get.bind(stage));

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
      colors, context
    })

    loadingStatus.classList.remove('hidden');
    stage.update({
      status: 'Loading file'
    });
    analyser.addStatusUpdateListener(stage.update.bind(stage));

    const audioFileData = await loadFileData();
    let audio, diffs, realBpm;

    try {
      ({ audio, diffs, bpm: realBpm } = await analyser.generateDiffs(audioFileData, bpmOption));

      if (!batch) {
        renderSingleVisualisation({
          diffVisualiser,
          diffs, thresholds, scale, audio, bpm: realBpm
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
    diffs, thresholds, scale, audio, bpm
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
    startSingleVisualisation(imageData, bpm);
  }

  async function renderBatchVisualisation({
    diffVisualiser,
    diffs
  }) {
    stage.update({
      status: 'Rendering visualisations'
    });
    let images = [];

    const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
    const maxThresholds = [90, 75, 50, 40, 30, 20, 15].map(v => v/100);
    const scales = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

    let count = 0;
    const totalVis = minThresholds.length * maxThresholds.length * scales.length;
    for (let min of minThresholds) {
      for (let max of maxThresholds) {
        for (let scale of scales) {

          const imageData = await diffVisualiser.renderVisualisation({
            diffs, thresholds: {min, max}, scale,
            updateStatus: ({status, task}) => {
              stage.update({
                status: `${status} ${count++}/${totalVis}`,
                task: task
              });
            }
          });
          images.push({
            description: `${scale}, min:${min}, max:${max}`,
            imageData
          });
        }
      }
    }

    loadingStatus.classList.add('hidden');
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

  function startSingleVisualisation(imageData, beatsPerMinute) {
    new SingleVisualisationPainter(canvas, context, imageData, beatsPerMinute).start();
  }

  function startBatchVisualisation(images) {
    new BatchVisualisationPainter(batchElement, images).start();
  }

  async function loadAudioSelection() {
    const audioResponse = await fetch('/audio/audio.json');
    return await audioResponse.json();
  }

});
