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
      this.context.lineWidth = 1;

      this.context.beginPath();

      const bufferLength = fft.length;

      const sliceWidth = this.canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {

        const v = fft[i] / 128.0;
        const y = this.canvas.height - v * this.canvas.height / 2;

        if (i === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.context.lineTo(this.canvas.width, this.canvas.height);
      this.context.stroke();  
    }
  }

  window.addEventListener('load', () => {

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

    canvas.width = window.innerWidth - 18 * 2;
    canvas.height = window.innerWidth - 18 * 2;

    window.addEventListener('resize', function() {
      canvas.width = window.innerWidth - 18 * 2;
      canvas.height = window.innerWidth - 18 * 2;

      fftAnalysisWorker.postMessage('trigger');
    });

    canvasSpectra.width = window.innerWidth - 18 * 2;
    canvasSpectra.height = window.innerWidth / 5;

    window.addEventListener('resize', function() {
      canvasSpectra.width = window.innerWidth - 18 * 2;
      canvasSpectra.height = window.innerWidth / 6;
    });

    let results = [];
    let last = {};

    fftAnalysisWorker.onmessage = event => {
      results = event.data;

      rendererWorker.postMessage({
        width: canvas.width,
        height: canvas.height
      });

      rendererWorker.postMessage(results, [results]);
    };

    rendererWorker.onmessage = event => {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(event.data, 0, 0);
    };

    fileInput.addEventListener('change', e => {
      const file = fileInput.files[0];
      if (!file || !file.type.startsWith('audio')) {
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

      if (!file || !file.type.startsWith('audio')) {
        formErrors.innerHTML = 'Please select an audio file.';
        return;
      }

      processData(file)

      form.classList.add('form__hidden');
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

