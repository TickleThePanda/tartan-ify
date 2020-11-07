import { CanvasSizeManager } from './app--canvas-size-manager.mjs';
import { AnalysisFormManager } from './app--analysis-form-manager.mjs';
import { VisualisationPainter } from './app--visualisation-painter.mjs';
import { MusicAnalyser } from './app--music-analyser.mjs';
import { ColorManager } from './app--color-manager.mjs';

window.addEventListener('load', () => {

  const loadingStatus = document.getElementById('loading-status');
  function updateLoadingStatus(m) {
    loadingStatus.innerHTML = m;
  }

  const visualiser = document.getElementById('visualiser');
  const canvas = document.getElementById('similarity-graph');
  const context = canvas.getContext('2d');

  const formManager = new AnalysisFormManager(
          document.getElementById('music-form')
  );

  const colorManager = new ColorManager(visualiser);
  const colors = colorManager.getColors();

  const canvasSizeManager = new CanvasSizeManager();

  canvasSizeManager.add(canvas);

  formManager.registerSubmitSuccessListener(submit);

  async function submit({
    interval, loadFileData
  }) {

    formManager.hide();
    visualiser.classList.remove('hidden');
    canvasSizeManager.triggerResize();

    const analyser = new MusicAnalyser(colors, context);

    loadingStatus.classList.remove('hidden');
    updateLoadingStatus('Loading file');
    analyser.addStatusUpdateListener(updateLoadingStatus);

    const audioFileData = await loadFileData();
    const {audio, image} = await analyser.processData(audioFileData, interval);

    loadingStatus.classList.add('hidden');

    playAudio(audio);
    startVisualisation(image, interval);
  };

  function playAudio(audio) {
    const ctx = new AudioContext();
    const bufferSrc = new AudioBufferSourceNode(ctx, {
      buffer: audio
    });
    bufferSrc.connect(ctx.destination);
    bufferSrc.start();

  }

  function startVisualisation(bmp, interval) {
    new VisualisationPainter(canvas, context, bmp, interval).start();
  }


});
