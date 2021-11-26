function isAudio(file) {
  return file.type === '' || file.type.startsWith('audio');
}

function getInputHandler(form, input) {
  const inputHandlers = {
    file: (_, i) => ({
      isSelected: () => i.value !== '' || i.files[0] !== undefined,
      reset: () => i.value = null,
      getNiceValue: () => i.files[0] !== undefined ? i.files[0].name : null,
    }),
    radio: (form, i) => ({
      isSelected: () => i.checked,
      reset: () => i.checked = false,
      getNiceValue: () => form.querySelector('label[for="' + i.id + '"]').textContent,
    }),
    text: (_, i) => ({
      isSelected: () => i.value !== '',
      reset: () => i.value = null,
      getNiceValue: () => i.value,
    }),
  }

  return inputHandlers[input.type.toLowerCase()](form, input);

}



function addLastSelectedEvents() {

  const watchers = document.querySelectorAll('.js-last-selected-value');

  for (let watcher of watchers) {
    const form = watcher.closest('form');

    const directInputs = watcher
      .dataset["for"]
      .split(/\s+/gi)
      .map(i => form.querySelector("#" + i));

    const formGroupInputs = watcher
      .dataset["forNames"]
      .split(/\s+/gi)
      .flatMap(i => [...form.querySelectorAll("[name=" + i + "]")]);

    const inputs = [... directInputs, ...formGroupInputs];

    const setWatcherValue = v => v !== null ? watcher.innerHTML = v : null;

    for (let input of inputs) {
      const handler = getInputHandler(form, input);

      const handleChange = (e) => {

        if (handler.isSelected()) {
          setWatcherValue(handler.getNiceValue());

          for (let inputToReset of inputs.filter(e => e !== input)) {
            const inputToResetHandler = getInputHandler(form, inputToReset);

            inputToResetHandler.reset();
          }
        }
      };

      input.addEventListener('click', handleChange);
      input.addEventListener('change', handleChange);

      if (handler.isSelected()) {
        setWatcherValue(handler.getNiceValue());
      }
    }

  }
}

class AnalysisFormManager {
  constructor(formElement, audioSelection) {
    this.formElement = formElement;

    this.fileInput = document.getElementById('music-file');
    this.bpmInput = document.getElementById('analysis-bpm');
    this.formErrors = document.getElementById('form-errors');
    this.submitButton = document.getElementById('form-submit');

    let examplesHtml = '';
    for (let example of audioSelection) {
      examplesHtml +=
        `
        <div class="form__radio-item">
          <input type="radio" id="example-options_${example.slug}" name="example-options" value="${example.url}">
          <label class="form__label form__label--checkbox" for="example-options_${example.slug}">${example.name}</label>
        </div>
        `;
    }

    document.querySelector('.js-example-toggle-options')
      .innerHTML = examplesHtml;

    addLastSelectedEvents();

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
    const bpmInput = this.bpmInput;

    this.formElement.addEventListener('submit', async (e) => {
      e.preventDefault();

      console.log("app--analysis-form-manager.mjs - submit event");

      const formData = new FormData(e.target);

      const uploadedFile = formData.get('music-file');
      const exampleAudio = formData.get('example-options');
      const detectBpm = formData.get('detect-bpm');
      const bpmText = formData.get('analysis-bpm');
      const dataScaleText = formData.get('scale');
      const minThresholdValue = formData.get('min-percentile');
      const maxThresholdValue = formData.get('max-percentile');

      if (minThresholdValue > maxThresholdValue) {
        formErrors.innerHTML = 'Max percentile must be grester than min percentile';
        return;
      }

      if (detectBpm !== 'detect-bpm' && isNaN(parseInt(bpmText))) {
        formErrors.innerHTML = 'Please select autodetect or specify a valid whole number for BPM';
        return;
      }

      const fileUploaded = uploadedFile.size !== 0;
      const exampleAudioSelected = exampleAudio !== null;

      if (!fileUploaded && !exampleAudioSelected) {
        formErrors.innerHTML = 'Please select an audio file.';
        return;
      }
      if (fileUploaded) {
        if (!isAudio(uploadedFile)) {
          formErrors.innerHTML = 'Please select an audio file.';
          return;
        }
      }

      const bpm = detectBpm !== 'detect-bpm' ? parseInt(bpmInput.value) : 'autodetect';

      const fileLoadFunction = fileUploaded
         ? async () => await loadFileData(uploadedFile)
         : async () => {
            const audioResponse = await fetch(exampleAudio);
            const audioBlob = await audioResponse.blob();
            return await loadFileData(audioBlob)
          };

      listeners.forEach(l => l({
        bpm: bpm,
        scale: dataScaleText,
        thresholds: {
          min: minThresholdValue / 100,
          max: maxThresholdValue / 100
        },
        loadFileData: fileLoadFunction
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

async function loadFileData(file) {
  return await new Promise(function(resolve, reject) {
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

export { AnalysisFormManager };