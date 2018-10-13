(() => {
  class Events {
    constructor(output) {
      this.output = output;
    }

    log(type, message) {
      const element = document.createElement('div');
      element.classList.add(type);
      element.innerHTML = message;
      this.output.appendChild(element);
    }
  }

  class MusicSimilarityRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
    }

    render(data) {

      this.context.fillStyle = '#000000';
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (data.length > 0) {
        const offset = 50;

        const width = (this.canvas.width - 50) / data.length;

        const max = [].concat.apply([], data)
            .map(i => i.diff)
            .reduce((a, b) => Math.max(a, b));

        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].length; j++) {

            const h = 180 + 130 - data[i][j].diff / max * 130;

            this.context.fillStyle = `hsl(${h}, 66%, 50%)`;

            const startX = offset + (i * width);
            const startY = offset + (j * width);

            this.context.fillRect(startX, startY, width, width);
          }
        }

        const ticksFreq = 10;

        for (let i = 0; i < data.length; i = i + ticksFreq) {
          const fontSize = 18;

          this.context.fillStyle = '#000000';
          this.context.font = fontSize + 'px sans-serif';
          this.context.fillText(i + "s", offset + i * width, 50 - 5);
          this.context.fillText(i + "s", 5, offset + fontSize + i * width, 50 - 5, 50);
        }
      }
    }
  }

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
      this.context.lineWidth = 2;

      this.context.beginPath();

      const bufferLength = fft.length;

      const sliceWidth = this.canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {

        const v = fft[i] / 128.0;
        const y = v * this.canvas.height / 2;

        if (i === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.context.lineTo(this.canvas.width, this.canvas.height / 2);
      this.context.stroke();  
    }
  }

  window.addEventListener('load', () => {

    const canvas = 
        document.getElementById('similarity-graph');
    canvas.width = window.innerWidth - 36;
    canvas.height = window.innerWidth - 36;

    window.addEventListener('resise', function() {
      canvas.width = window.innerWidth - 36;
      canvas.height = window.innerWidth - 36;
    });

    const renderer = new MusicSimilarityRenderer(canvas);
    const spectraRenderer = new SpectraRenderer(document.getElementById('spectra'));

    const form = document.getElementById('music-form');
    const fileInput = document.getElementById('music-file');

    const appEventsElement = document.getElementById('music-app-events');

    const events = new Events(appEventsElement);

    const fftAnalysisWorker = new Worker('/js/worker.js');

    let results = [];
    let last = {};

    fftAnalysisWorker.onmessage = event => {
      results = event.data;
      renderer.render(results);
    };

    form.addEventListener('submit', submit);

    function submit(e) {
      e.preventDefault();

      const file = fileInput.files[0];

      if (!file || !file.type.startsWith('audio')) {
        events.log('error', 'Please select an audio file.');
        return;
      }

      events.log('info', 'You selected \"' + file.name + "\"");

      processData(file)

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

        last = fft;

        fftAnalysisWorker.postMessage(fft);

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
        spectraRenderer.setColor('#000000');
        spectraRenderer.render(fft);
        spectraRenderer.setColor('#888888');
        spectraRenderer.render(last);

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

