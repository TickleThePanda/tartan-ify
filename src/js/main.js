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

  class VisualisationPainter {
    constructor(canvas, image, interval) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      this.image = image;
      this.interval = interval;
    }

    start() {

      const image = this.image;
      const canvas = this.canvas;
      const context = this.context;
      const interval = this.interval;

      const startTime = new Date();

      let elapsedIntervals = 0;

      (function loop() {
        window.requestAnimationFrame(function() {

          elapsedIntervals = Math.floor((new Date() - startTime) / interval);

          draw();

          if (elapsedIntervals < image.width) {
            loop();
          }
        });
      })();

      window.addEventListener('resize', function() {
        window.requestAnimationFrame(function() {
          draw();
        });
      });

      function draw() {
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, canvas.width, canvas.height);

        const wholeImageControl = document.getElementById('show-whole-image');
        const cursorControl = document.getElementById('show-cursor');

        if (wholeImageControl.checked) {
          context.drawImage(image, 0, 0, image.width, image.width, 0, 0, canvas.width, canvas.width);

          const progress = elapsedIntervals;
          const pixelSize = canvas.width / image.width;
          const progressOnCanvas = pixelSize * elapsedIntervals - pixelSize / 2;

          if (cursorControl.checked) {
            const path = new Path2D();

            path.moveTo(0, progressOnCanvas);
            path.lineTo(progressOnCanvas, progressOnCanvas);
            path.lineTo(progressOnCanvas, 0);
            context.lineWidth = pixelSize;
            context.strokeStyle = 'black';
            context.stroke(path);
          }

        } else {
          context.drawImage(image, 0, 0, elapsedIntervals, elapsedIntervals, 0, 0, canvas.width, canvas.width);
        }
      }
    }

  }

  window.addEventListener('load', () => {

    const loadingStatus = document.getElementById('loading-status');

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

    async function processData(file, interval) {

      loadingStatus.classList.remove('hidden');
      loadingStatus.innerHTML = 'Loading data from file';

      const ctx = new AudioContext();

      const encBuf = await loadDataFromFile(file);

      loadingStatus.innerHTML = 'Decoding audio data';

      const audioData = await ctx.decodeAudioData(encBuf);

      const bufferSrc = new AudioBufferSourceNode(ctx, {
        buffer: audioData
      });
      bufferSrc.connect(ctx.destination);

      loadingStatus.innerHTML = 'Calculating frequency data';

      const fftsForIntervals = await calculateFftsForIntervals(audioData, interval);

      loadingStatus.innerHTML = 'Calculating differences';

      const diffs = await calculateFftDiffs(fftsForIntervals);

      loadingStatus.innerHTML = 'Rendering visualisation';

      const bmp = await renderImageFromDiffs(diffs);

      loadingStatus.classList.add('hidden');

      bufferSrc.start();

      new VisualisationPainter(canvas, bmp, interval).start();


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

    function addFileUploadHandler() {
      const inputs = document.querySelectorAll('.js-file-upload-input');
      for (let input of inputs) {
        const inputId = input.id;
        const fileNameLabel = Array.from(document.querySelectorAll('.js-file-upload-name')).find(e => e.dataset["for"] === inputId);
        console.log(input, fileNameLabel);
        input.addEventListener('change', (e) => {
          const file = input.files[0];
          if (file !== undefined) {
            fileNameLabel.innerHTML = file.name;
          }
        })
      }

    }

    addFileUploadHandler();


  });

})();
