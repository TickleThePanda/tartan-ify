(() => {

  class SpectraRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
    }

    clear() {
      this.context.fillStyle = "rgb(255, 255, 255)";
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setColor(color) {
      this.context.strokeStyle = color;
    }

    render(fft) {
      const context = this.context;
      const canvas = this.canvas;

      context.lineWidth = 1;

      context.beginPath();

      const bufferLength = fft.length;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const visDirection = canvasWidth > canvasHeight ? 'h' : 'v';

      const visWidth = visDirection === 'h' ? canvasWidth : canvasHeight;
      const visHeight = visDirection === 'h' ? canvasHeight : canvasWidth;

      function lineTo(visX, visY) {
        if (visDirection === 'h') {
          context.lineTo(visX, visY);
        } else {
          context.lineTo(visY, visWidth - visX);
        }
      }


      const sliceWidth = visWidth * 1.0 / bufferLength;
      let visX = 0;

      for (let i = 0; i < bufferLength; i++) {

        const v = fft[i] / 128.0;
        const visY = visHeight - v * visHeight / 2;

        lineTo(visX, visY);

        visX += sliceWidth;
      }

      lineTo(visWidth, visHeight);
      context.stroke();  
    }
  }

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

  window.addEventListener('load', () => {

    const visualiser = document.getElementById('visualiser');
    const canvas = document.getElementById('similarity-graph');
    const canvasSpectra = document.getElementById('spectra');

    const spectraRenderer = new SpectraRenderer(canvasSpectra);

    const form = document.getElementById('music-form');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileInput = document.getElementById('music-file');
    const formErrors = document.getElementById('form-errors');
    const submitButton = document.getElementById('form-submit');

    const fftAnalysisWorker = new Worker('/js/worker.js');
    const rendererWorker = new Worker('/js/renderer.js');

    const canvasSizeManager = new CanvasSizeManager();

    canvasSizeManager.add(canvas, function() {
      fftAnalysisWorker.postMessage('trigger'); 
    });

    canvasSizeManager.add(canvasSpectra);

    let results = [];
    let last = {};

    fftAnalysisWorker.onmessage = event => {
      results = event.data;

      rendererWorker.postMessage(results, [results]);
    };

    rendererWorker.onmessage = async event => {
      const array = new Uint8ClampedArray(event.data);

      const wFromRenderer = Math.sqrt(array.length / 4);

      const context = canvas.getContext('2d');

			const image = context.createImageData(wFromRenderer, wFromRenderer);
			
			image.data.set(array);

      const bmp = await createImageBitmap(image, 0, 0, wFromRenderer, wFromRenderer);

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(bmp, 0, 0, canvas.width, canvas.width);
    };

    fileInput.addEventListener('change', e => {
      const file = fileInput.files[0];
      if (!file || !isAudio(file)) {
        formErrors.innerHTML = 'Please select an audio file';
        return;
      }

      formErrors.innerHTML = '';
      fileUploadLabel.classList.remove('form__button--active');
      submitButton.classList.add('form__button--active');
    });

    form.addEventListener('submit', submit);

    function submit(e) {
      e.preventDefault();

      const file = fileInput.files[0];

      if (!file || !isAudio(file)) {
        formErrors.innerHTML = 'Please select an audio file.';
        return;
      }

      processData(file)

      form.classList.add('hidden');
      visualiser.classList.remove('hidden');
      canvasSizeManager.triggerResize();
    }

    function isAudio(file) {
      return file.type === '' || file.type.startsWith('audio');
    }

    let intervalId = null;


    async function processData(file) {
      const ctx = new AudioContext();

      const encBuf = await loadDataFromFile(file);

      const audBuf = await ctx.decodeAudioData(encBuf);

      const bufferSrc = new AudioBufferSourceNode(ctx, {
        buffer: audBuf
      });

      let analyser;

      swapForNewAnalyser();

      function swapForNewAnalyser() {

        let a = ctx.createAnalyser();
        a.fttSize = Math.pow(2, 10);
        a.smoothingTimeConstant = 0.99;

        analyser = a;

        bufferSrc.connect(analyser);
      }

      bufferSrc.connect(ctx.destination);

      const startTime = new Date();

      const interval = 1000;

      intervalId = setInterval(function() {
        const fft = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fft);

        const buffer = fft.buffer;

        last = new Uint8Array(buffer.slice(0));

        fftAnalysisWorker.postMessage(buffer, [buffer]);

        document.getElementById('song-progress').innerHTML 
          = Math.round((new Date() - startTime) / interval) + 's';

        swapForNewAnalyser();

      }, interval);

      bufferSrc.onended = () => {
        clearInterval(intervalId);
      }
    
      (function spectraLoop() {
        window.requestAnimationFrame(spectraLoop);
        const fft = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fft);
        spectraRenderer.clear();
        spectraRenderer.setColor('hsl(180, 100%, 35%)');
        spectraRenderer.render(last);
        spectraRenderer.setColor('hsl(310, 100%, 40%)');
        spectraRenderer.render(fft);

      })();

      bufferSrc.start();
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

