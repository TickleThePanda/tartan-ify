
class SubmitEvent extends Event {
  submitter: HTMLInputElement;
}

export class AnalysisFormManager {
  formElement;
  fileInput: HTMLInputElement;
  bpmInput: HTMLInputElement;
  formErrors: HTMLInputElement;
  submitButton: HTMLInputElement;
  listeners: AnalysisFormSubmitListener[];

  constructor(
    formElement: HTMLElement,
    audioSelection: {
      slug: string,
      url: string,
      name: string
    }[]
  ) {
    this.formElement = formElement;

    this.fileInput = <HTMLInputElement> document.getElementById('music-file');
    this.bpmInput = <HTMLInputElement> document.getElementById('analysis-bpm');
    this.formErrors = <HTMLInputElement> document.getElementById('form-errors');
    this.submitButton = <HTMLInputElement> document.getElementById('form-submit');

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

    const listeners = this.listeners;
    const formErrors = this.formErrors;
    const bpmInput = this.bpmInput;

    this.formElement.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();

      const submitType = e.submitter.value;

      console.log("app--analysis-form-manager.mjs - submit event");

      const formData = new FormData(<HTMLFormElement> e.target);

      const uploadedFile = <Blob> formData.get('music-file');
      const exampleAudio = <string> formData.get('example-options');
      const detectBpm = formData.get('detect-bpm');
      const autodetectMultiplier = <string> formData.get('detect-bpm-multiplier');
      const bpmText = <string> formData.get('analysis-bpm');
      const dataScaleText = <string> formData.get('scale');
      const minThresholdValue = <string> formData.get('min-percentile');
      const maxThresholdValue = <string> formData.get('max-percentile');
      const minColor = <string> formData.get('min-color');
      const maxColor = <string> formData.get('max-color');

      if (parseFloat(minThresholdValue) > parseFloat(maxThresholdValue)) {
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

      let batch = submitType === 'batch';

      const fileLoadFunction: FileDataLoader = fileUploaded
         ? async () => await loadFileData(uploadedFile)
         : async () => {
            const audioResponse = await fetch(exampleAudio);
            const audioBlob = await audioResponse.blob();
            return await loadFileData(audioBlob)
          };

      listeners.forEach(l => l({
        bpm: {
          autodetect: detectBpm === 'detect-bpm',
          autodetectMultiplier: parseFloat(autodetectMultiplier),
          value: parseFloat(bpmInput.value)
        },
        singleOptions: {
          scale: <ScaleOptions> dataScaleText,
          thresholds: {
            min: parseFloat(minThresholdValue) / 100,
            max: parseFloat(maxThresholdValue) / 100
          },
        },
        colors: {
          similar: minColor,
          diff: maxColor
        },
        batch,
        loadFileData: fileLoadFunction
      }));

    });
  }

  hide() {
    this.formElement.classList.add('hidden');
  }

  registerSubmitSuccessListener(listener: AnalysisFormSubmitListener) {
    this.listeners.push(listener);
  }

}

type AnalysisFormSubmitListener = (event: AnalysisFormSubmitEvent) => any

type AnalysisFormSubmitEvent = AnalysisOptions;

async function loadFileData(file: Blob): Promise<ArrayBuffer> {
  return await new Promise(function(resolve, reject) {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      resolve(<ArrayBuffer> fileReader.result);
    }

    fileReader.onerror = function (event) {
      reject(event);
    }

    fileReader.readAsArrayBuffer(file);

  });
}


function isAudio(file: Blob) {
  return file.type === '' || file.type.startsWith('audio');
}

function getInputHandler(form: HTMLFormElement, input: HTMLInputElement): InputHandler {

  const inputHandlers: InputHandlers = {
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


type InputHandlers = Record<string, InputHandlerCreator>;
type InputHandlerCreator = (form: HTMLFormElement, input: HTMLInputElement) => InputHandler;

type InputHandler = {
  isSelected: () => boolean,
  reset: () => any,
  getNiceValue: () => string
};

function addLastSelectedEvents() {

  const watchers = document.querySelectorAll('.js-last-selected-value');

  for (let watcher of <HTMLElement[]> Array.from(watchers)) {
    const form = <HTMLFormElement> watcher.closest('form');

    const directInputs = watcher
      .dataset["for"]
      .split(/\s+/gi)
      .map(i => <HTMLInputElement> form.querySelector("#" + i));

    const formGroupInputs = watcher
      .dataset["forNames"]
      .split(/\s+/gi)
      .flatMap(i => <HTMLInputElement[]> Array.from(form.querySelectorAll("[name=" + i + "]")));

    const inputs: HTMLInputElement[] = [... directInputs, ...formGroupInputs];

    const setWatcherValue = (v: string) => v !== null ? watcher.innerHTML = v : null;

    for (let input of inputs) {
      const handler = getInputHandler(form, input);

      const handleChange = () => {

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

export type FileDataLoader = () => Promise<ArrayBuffer>;

export type AnalysisOptions = {
  bpm: BpmOptions,
  singleOptions: {
    scale: ScaleOptions,
    thresholds: ThresholdOptions,
  },
  colors: VisualisationColors,
  batch: boolean,
  loadFileData: FileDataLoader
};

export type ScaleOptions = "log" | "sqrt" | "linear" | "squared" | "exponential";

export type ThresholdOptions = {
  min: number,
  max: number
};

export type VisualisationColors = {
  similar: string,
  diff: string
}

export type BpmOptions = {
  autodetect: boolean,
  autodetectMultiplier: number,
  value: number
};

