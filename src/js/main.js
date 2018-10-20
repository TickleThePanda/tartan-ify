(() => {

  function resizeCanvas(canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  class CanvasSizeManager {
    constructor() {
      const canvases = [];
      this.canvases = canvases;

      window.addEventListener('resize', function() {
        canvases.forEach(c => {
          resizeCanvas(c.canvas);
          if (c.callback) {
            c.callback();
          }
        });
      });
    }

    add(canvas, callback) {
      this.canvases.push({
        canvas: canvas,
        callback: callback
      });
      resizeCanvas(canvas);
    }

    triggerResize() {
      this.canvases.map(c => c.canvas)
        .forEach(resizeCanvas);
    }
  }

  function isAudio(file) {
    return file.type === '' || file.type.startsWith('audio');
  }

  class AnalysisFormManager {
    constructor(formElement) {
      this.formElement = formElement;

      this.fileInput = document.getElementById('music-file');
      this.intervalInput = document.getElementById('analysis-interval');
      this.formErrors = document.getElementById('form-errors');
      this.submitButton = document.getElementById('form-submit');

      this.fileInput.addEventListener('change', e => {
        const file = this.fileInput.files[0];
        if (!file || !isAudio(file)) {
          this.formErrors.innerHTML = 'Please select an audio file';
        } else {
          this.formErrors.innerHTML = '';
        }

      });

      this.listeners = [];

      const fileInput = this.fileInput;
      const listeners = this.listeners;
      const formErrors = this.formErrors;
      const intervalInput = this.intervalInput;

      this.formElement.addEventListener('submit', function(e) {
        e.preventDefault();

        const file = fileInput.files[0];

        if (!file || !isAudio(file)) {
          formErrors.innerHTML = 'Please select an audio file.';
          return;
        }

        if (isNaN(parseInt(intervalInput.value))) {
          formErrors.innerHTML = 'Please give a valid whole number for Interval';
          return;
        }

        listeners.forEach(l => l({
          file: file,
          interval: parseInt(intervalInput.value)
        }));

      });
    }

    hide() {
      this.formElement.classList.add('hidden');
    }

    registerSubmitSuccessListener(listener) {
      this.listeners.push(listener);
    }
  }


  window.addEventListener('load', () => {

    const visualiser = document.getElementById('visualiser');
    const canvas = document.getElementById('similarity-graph');
    const context = canvas.getContext('2d');

    const formManager = new AnalysisFormManager(
            document.getElementById('music-form')
    );

    const computedStyle = getComputedStyle(visualiser);

    const colors = {
      diff: computedStyle.getPropertyValue('--color-diff'),
      similar: computedStyle.getPropertyValue('--color-similar'),
      primary: computedStyle.getPropertyValue('--palette-primary'),
      secondary: computedStyle.getPropertyValue('--palette-secondary')
    };

    const canvasSizeManager = new CanvasSizeManager();

    canvasSizeManager.add(canvas);

    let results = [];
    let last = {};

    formManager.registerSubmitSuccessListener(submit);

    function submit(result) {

      processData(result.file, result.interval);

      formManager.hide();
      visualiser.classList.remove('hidden');
      canvasSizeManager.triggerResize();
    }

    let intervalId = null;

    async function processData(file, interval) {
      const ctx = new AudioContext();

      const encBuf = await loadDataFromFile(file);

      const audioData = await ctx.decodeAudioData(encBuf);

      const bufferSrc = new AudioBufferSourceNode(ctx, {
        buffer: audioData
      });
      bufferSrc.connect(ctx.destination);

      const fftsForIntervals = await calculateFftsForIntervals(audioData, interval);

      const diffs = await calculateFftDiffs(fftsForIntervals);

      const bmp = await renderImageFromDiffs(diffs);
      context.imageSmoothingEnabled = false;

      bufferSrc.start();

      const startTime = new Date();

      const intervalId = setInterval(function() {

        window.requestAnimationFrame(function() {

          const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);

          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(bmp, 0, 0, elapsedSeconds, elapsedSeconds, 0, 0, canvas.width, canvas.width);

          if (elapsedSeconds >= bmp.width) {
            clearInterval(intervalId);
          }

        });

      }, interval);

    }

    async function renderImageFromDiffs(ffts) {
      return new Promise(function(resolve, reject) {
        const rendererWorker = new Worker('/js/renderer.js');

        rendererWorker.postMessage(colors);

        rendererWorker.onmessage = async event => {
          const array = new Uint8ClampedArray(event.data);

          const wFromRenderer = Math.sqrt(array.length / 4);

          const image = context.createImageData(wFromRenderer, wFromRenderer);
          
          image.data.set(array);

          const bmp = await createImageBitmap(image, 0, 0, wFromRenderer, wFromRenderer);

          resolve(bmp);
        };

        const buffer = ffts.buffer;

        rendererWorker.postMessage(buffer, [buffer]);

      });
    }

    async function calculateFftDiffs(ffts) {
      return new Promise(function(resolve, reject) {
        const diffAnalyserWorker = new Worker('/js/diff-analysis.js');

        const buffers = ffts.map(f => f.buffer);

        diffAnalyserWorker.onmessage = function(message) {
          resolve(new Float32Array(message.data));
          diffAnalyserWorker.terminate();
        }

        diffAnalyserWorker.postMessage(buffers, buffers);

      });
    }

    async function calculateFftsForIntervals(audioData, interval) {
      
      return new Promise(function(resolve, reject) {
        const fftWorker = new Worker('/js/fft.js');

        const buffers = [];

        for (let i = 0; i < audioData.numberOfChannels; i++) {
          buffers.push(audioData.getChannelData(i).buffer);
        }

        fftWorker.onmessage = function(message) {
          resolve(message.data.map(f => new Float32Array(f)));
          fftWorker.terminate();
        }
        
        fftWorker.postMessage({
          sampleRate: audioData.sampleRate,
          interval: interval,
          buffers: buffers
        }, buffers);
        
      });
    
    }

    

    function loadDataFromFile(file) {
      return new Promise(function(resolve, reject) {
          const fileReader = new FileReader();

          fileReader.onload = function() {
            resolve(fileReader.result);
          }

          fileReader.onerror = function (event) {
            reject(event);
          }

          fileReader.readAsArrayBuffer(file);

      });

    }

  });

})();

