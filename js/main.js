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
            .reduce((a, b) => Math.max(a, b));

        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].length; j++) {

            const n = 255 - Math.floor(data[i][j] / max * 255);

            this.context.fillStyle = `rgb(${n}, ${n}, ${n})`;

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

  window.addEventListener('load', () => {

    const canvas = 
        document.getElementById('similarity-graph');
    console.log(innerWidth);
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth;

    window.addEventListener('resise', function() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerWidth;
    });

    const renderer = new MusicSimilarityRenderer(canvas);

    const form = document.getElementById('music-form');
    const fileInput = document.getElementById('music-file');

    const appEventsElement = document.getElementById('music-app-events');

    const events = new Events(appEventsElement);

    const fftAnalysisWorker = new Worker('/js/worker.js');

    let results = [];

    fftAnalysisWorker.onmessage = event => {
      results = event.data;
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
        .then(console.log);

    }

    let intervalId = null;


    async function processData(file) {
      const ctx = new AudioContext();

      const encBuf = await loadDataFromFile(file);

      const audBuf = await ctx.decodeAudioData(encBuf);
      
      console.log(audBuf);

      const analyser = ctx.createAnalyser();

      analyser.fttSize = Math.pow(2, 11);
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);

      const bufferSrc = new AudioBufferSourceNode(ctx, {
        buffer: audBuf
      });

      bufferSrc.connect(analyser);

      intervalId = setInterval(function() {
        const fft = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fft);

        console.log(fft);

        fftAnalysisWorker.postMessage(fft);
      }, 1000);

      bufferSrc.onended = () => {
        clearInterval(intervalId);
      }

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

    (function animationLoop() {
      window.requestAnimationFrame(animationLoop);
      renderer.render(results);
    })();


  });


})();

