function isAudio(file) {
  return file.type === '' || file.type.startsWith('audio');
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
      .dataset
      .forNames
      .split(/\s+/gi)
      .flatMap(i => [...form.querySelectorAll("[name=" + i + "]")]);

    const inputs = [... directInputs, ...formGroupInputs];

    for (let input of inputs) {
      input.addEventListener('change', (e) => {
        if (input.type.toLowerCase() === 'file') {
          const file = input.files[0];
          if (file !== undefined) {
            watcher.innerHTML = file.name;
          }
        } else {
          watcher.innerHTML = form.querySelector('label[for="' + input.id + '"]').innerHTML;
        }

        for (let inputToReset of inputs.filter(e => e !== input)) {
          const type = inputToReset.type.toLowerCase();
          switch (type) {
            case 'file':
              inputToReset.value = null;
              break;
            case 'radio':
              inputToReset.checked = false;
              break;
          }
        }
      });
    }

  }
}

class AnalysisFormManager {
  constructor(formElement, audioSelection) {
    this.formElement = formElement;

    this.fileInput = document.getElementById('music-file');
    this.intervalInput = document.getElementById('analysis-interval');
    this.formErrors = document.getElementById('form-errors');
    this.submitButton = document.getElementById('form-submit');

    let examplesHtml = '';
    for (let example of audioSelection) {
      examplesHtml +=
        `
        <div class="form__radio-item">
          <input type="radio" id="example-options_${example.slug}" name="example-options" value="${example.url}">
          <label for="example-options_${example.slug}">${example.name}</label>
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
    const intervalInput = this.intervalInput;

    this.formElement.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);

      const uploadedFile = formData.get('music-file');
      const exampleAudio = formData.get('example-options');
      const intervalText = formData.get('analysis-interval');

      if (isNaN(parseInt(intervalText))) {
        formErrors.innerHTML = 'Please give a valid whole number for Interval';
        return;
      }

      const fileUploaded = uploadedFile.size !== 0;
      const exampleAudioSelected = exampleAudio !== undefined;

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

      const interval = parseInt(intervalInput.value);

      const fileLoadFunction = fileUploaded
         ? async () => await loadFileData(uploadedFile)
         : async () => {
            const audioResponse = await fetch(exampleAudio);
            const audioBlob = await audioResponse.blob();
            return await loadFileData(audioBlob)
          };

      listeners.forEach(l => l({
        interval: interval,
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