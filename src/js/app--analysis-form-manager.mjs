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
        interval: parseInt(intervalInput.value),
        loadFileData: async () => await loadFileData(file)
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