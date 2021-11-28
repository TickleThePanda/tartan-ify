import { CanvasSizeManager } from './view--canvas-size.mjs';
import { AnalysisFormManager } from './view--analysis-form.mjs';
import { VisualisationPainter } from './view--graph.mjs';
import { MusicAnalyser } from './app--music-analyser.mjs';
import { ColorManager } from './view--colors.mjs';
import { DiffVisualiser } from './app--diff-visualiser.mjs';

window.addEventListener('load', async () => {

  const loadingStatus = document.getElementById('loading-status');
  function updateLoadingStatus(m) {
    loadingStatus.innerHTML = m;
  }

  const visualiser = document.getElementById('visualiser');
  const batch = document.getElementById('batch');
  const canvas = document.getElementById('similarity-graph');
  const context = canvas.getContext('2d');

  const formManager = new AnalysisFormManager(
    document.getElementById('music-form'),
    await loadAudioSelection()
  );

  const colorManager = new ColorManager(visualiser);
  const colors = colorManager.getColors();

  const canvasSizeManager = new CanvasSizeManager();

  canvasSizeManager.add(canvas);

  formManager.registerSubmitSuccessListener(analyse);

  async function analyse({
    bpm: bpmOption, singleOptions: { scale, thresholds }, batch, loadFileData
  }) {

    console.log("app--main.mjs - Processing data");

    formManager.hide();

    const analyser = new MusicAnalyser({
      scale, thresholds
    });
    const diffVisualiser = new DiffVisualiser({
      colors, context
    })

    loadingStatus.classList.remove('hidden');
    updateLoadingStatus('Loading file');
    analyser.addStatusUpdateListener(updateLoadingStatus);

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
      loadingStatus.innerHTML = `There was a problem generating the visualisation.<br>${e}`;
      loadingStatus.classList.add('error');
      return;
    }

  };

  async function renderSingleVisualisation({
    diffVisualiser,
    diffs, thresholds, scale, audio, bpm
  }) {
    updateLoadingStatus('Rendering visualisation');
    imageData = await diffVisualiser.renderVisualisation({diffs, thresholds, scale});
    visualiser.classList.remove('hidden');
    canvasSizeManager.triggerResize();
    loadingStatus.classList.add('hidden');
    playAudio(audio);
    startVisualisation(imageData, bpm);
  }

  async function renderBatchVisualisation({
    diffVisualiser,
    diffs
  }) {
    updateLoadingStatus('Rendering visualisations');
    let images = [];

    const minThresholds = [0, 0.1, 1, 10].map(v => v/100);
    const maxThresholds = [100, 75, 50, 40, 30, 20, 15].map(v => v/100);
    const scales = ['log', 'sqrt', 'linear', 'squared', 'exponential'];

    let count = 0;
    const totalVis = minThresholds.length * maxThresholds.length * scales.length;
    for (let min of minThresholds) {
      for (let max of maxThresholds) {
        for (let scale of scales) {

          updateLoadingStatus(`Rendering visualisation ${count++}/${totalVis}`);
          const imageData = await diffVisualiser.renderVisualisation({diffs, thresholds: {min, max}, scale});
          images.push({
            description: `${scale}, min:${min}, max:${max}`,
            imageData
          });
        }
      }
    }

    loadingStatus.classList.add('hidden');
    batch.classList.remove('hidden');

    for (let image of images) {
      const div = document.createElement('div');
      div.className = 'batch--item';

      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;

      const heading = document.createElement('h3');
      heading.innerHTML = image.description;

      batch.appendChild(div);
      div.appendChild(heading);
      div.appendChild(canvas);

      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(image.imageData, 0, 0, canvas.width, canvas.height);
    }


  }

  function playAudio(audio) {
    const ctx = new AudioContext();
    const bufferSrc = new AudioBufferSourceNode(ctx, {
      buffer: audio
    });
    bufferSrc.connect(ctx.destination);
    bufferSrc.start();

  }

  function startVisualisation(imageData, beatsPerMinute) {
    new VisualisationPainter(canvas, context, imageData, beatsPerMinute).start();
  }

  async function loadAudioSelection() {
    const audioResponse = await fetch('/audio/audio.json');
    return await audioResponse.json();
  }

});
