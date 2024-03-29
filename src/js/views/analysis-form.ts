import { handleMultiSelectElements } from "./multi-select-manager";

export class AnalysisFormManager {
  wrapperElement;
  formElement;
  filesInput: HTMLInputElement;
  bpmInput: HTMLInputElement;
  formErrors: HTMLInputElement;
  submitButton: HTMLInputElement;

  singleListeners: ((event: SingleAnalysisOptions) => void)[] = [];
  batchParamListeners: ((event: BatchParamAnalysisOptions) => void)[] = [];
  batchFileListeners: ((event: BatchFileAnalysisOptions) => void)[] = [];
  historyListeners: ((event: void) => void)[] = [];

  constructor(
    wrapperElement: HTMLElement,
    formElement: HTMLFormElement,
    audioSelection: {
      slug: string;
      url: string;
      name: string;
      attribution?: string;
    }[]
  ) {
    this.formElement = formElement;
    this.wrapperElement = wrapperElement;

    this.filesInput = <HTMLInputElement>document.getElementById("music-files");
    this.bpmInput = <HTMLInputElement>document.getElementById("analysis-bpm");
    this.formErrors = <HTMLInputElement>document.getElementById("form-errors");
    this.submitButton = <HTMLInputElement>(
      document.getElementById("form-submit")
    );

    let examplesHtml = "";
    for (const example of audioSelection) {
      let attributionHtml =
        example.attribution !== undefined
          ? `<div class=\"attribution form__label-details-low">${example.attribution}</div>`
          : "";

      examplesHtml += `
        <div class="form__radio-item">
          <input type="radio" id="example-options_${example.slug}" name="example-options" value="${example.url}">
          <label class="form__label form__label--checkbox" for="example-options_${example.slug}">${example.name}</label>
          ${attributionHtml}
        </div>
        `;
    }

    const toggleOptions = document.querySelector(".js-example-toggle-options");

    if (toggleOptions !== null) {
      toggleOptions.innerHTML = examplesHtml;
    } else {
      throw new Error(
        "Unable to set options, no such element .js-example-toggle-options"
      );
    }

    handleMultiSelectElements();

    this.filesInput.addEventListener("change", () => {
      const files = this.filesInput.files;

      if (files === null) {
        throw new Error("File input list was null");
      }

      if (files.length === 0 || !containsOnlyAudioFiles(files)) {
        this.formErrors.innerHTML = "Please select at least one audio file";
      } else {
        this.formErrors.innerHTML = "";
      }
    });
    const formErrors = this.formErrors;
    const bpmInput = this.bpmInput;

    this.formElement.addEventListener("submit", (event: SubmitEvent) => {
      event.preventDefault();
      const formData = new FormData(this.formElement);
      const submitter = <HTMLInputElement>event?.submitter;

      const submitType = submitter?.value;

      if (submitType === "history") {
        this.historyListeners.forEach((l) => l());
        return;
      }

      console.log("app--analysis-form-manager.mjs - submit event");

      const selectedFiles = <File[]>formData.getAll("music-files");
      const exampleAudio = <string>formData.get("example-options");
      const detectBpm = formData.get("detect-bpm");
      const autodetectMultiplier = <string>(
        formData.get("detect-bpm-multiplier")
      );
      const bpmText = <string>formData.get("analysis-bpm");
      const dataScaleText = <string>formData.get("scale");
      const minThresholdValue = <string>formData.get("min-percentile");
      const maxThresholdValue = <string>formData.get("max-percentile");
      const minColor = <string>formData.get("min-color");
      const maxColor = <string>formData.get("max-color");

      if (parseFloat(minThresholdValue) > parseFloat(maxThresholdValue)) {
        formErrors.innerHTML =
          "Max percentile must be grester than min percentile";
        return;
      }

      if (detectBpm !== "detect-bpm" && isNaN(parseInt(bpmText))) {
        formErrors.innerHTML =
          "Please select autodetect or specify a valid whole number for BPM";
        return;
      }

      const filesWereUploaded =
        selectedFiles.length !== 0 && allHaveContent(selectedFiles);
      const exampleAudioSelected = exampleAudio !== null;

      if (!filesWereUploaded && !exampleAudioSelected) {
        formErrors.innerHTML = "Please select an audio file.";
        return;
      }
      if (filesWereUploaded && !containsOnlyAudioFiles(selectedFiles)) {
        formErrors.innerHTML = "Please select an audio file.";
        return;
      }

      const multiFileLoad: FileDataLoaders = filesWereUploaded
        ? loadFiles(selectedFiles)
        : [loadFileFromUrl(exampleAudio)];

      const singleFileLoad: FileDataLoader = filesWereUploaded
        ? () =>
            loadFileData(
              selectedFiles[0] ??
                (() => {
                  throw new Error("Unable to get selected file");
                })()
            )
        : loadFileFromUrl(exampleAudio);

      const bpm = {
        autodetect: detectBpm === "detect-bpm",
        autodetectMultiplier: parseFloat(autodetectMultiplier),
        value: parseFloat(bpmInput.value),
      };

      const colors = {
        similar: minColor,
        diff: maxColor,
      };

      const thresholds = {
        min: parseFloat(minThresholdValue) / 100,
        max: parseFloat(maxThresholdValue) / 100,
      };

      const scale = <ScaleOptions>dataScaleText;

      if (submitType === "batch") {
        if (selectedFiles.length > 1) {
          formErrors.innerHTML = "Batch param mode only supports one file.";
          return;
        }

        this.batchParamListeners.forEach((l) =>
          l({
            bpm,
            colors,
            fileLoader: singleFileLoad,
          })
        );
      } else if (selectedFiles.length > 1) {
        this.batchFileListeners.forEach((l) =>
          l({
            bpm,
            colors,
            thresholds,
            scale,
            fileLoaders: multiFileLoad,
          })
        );
      } else {
        this.singleListeners.forEach((l) =>
          l({
            bpm,
            colors,
            thresholds,
            scale,
            fileLoader: singleFileLoad,
          })
        );
      }
    });
  }

  hide(): void {
    this.wrapperElement.classList.add("hidden");
  }

  registerSingleSubmitListener(
    listener: (event: SingleAnalysisOptions) => void
  ): void {
    this.singleListeners.push(listener);
  }
  registerBatchFileSubmitListener(
    listener: (event: BatchFileAnalysisOptions) => void
  ): void {
    this.batchFileListeners.push(listener);
  }
  registerBatchParamSubmitListener(
    listener: (event: BatchParamAnalysisOptions) => void
  ): void {
    this.batchParamListeners.push(listener);
  }
  registerHistoryListener(listener: (v: void) => void): void {
    this.historyListeners.push(listener);
  }
}

function loadFiles(files: File[] | FileList): FileDataLoader[] {
  return Array.from(files).map((f) => () => loadFileData(f));
}

function loadFileFromUrl(exampleAudio: string): FileDataLoader {
  return async () => {
    const audioResponse = await fetch(exampleAudio);
    const audioBlob = await audioResponse.blob();
    return {
      name: exampleAudio.split("/").pop() ?? "Unknown",
      data: await loadBlobData(audioBlob),
    };
  };
}

async function loadFileData(file: File): Promise<FileWithInfo> {
  return {
    name: file.name,
    data: await loadBlobData(file),
  };
}

async function loadBlobData(blob: Blob): Promise<ArrayBuffer> {
  return await new Promise(function (resolve, reject) {
    const fileReader = new FileReader();

    fileReader.onload = function () {
      resolve(<ArrayBuffer>fileReader.result);
    };

    fileReader.onerror = function (event) {
      reject(event);
    };

    fileReader.readAsArrayBuffer(blob);
  });
}

function containsOnlyAudioFiles(files: File[] | FileList) {
  return Array.from(files).every(isAudio);
}

function allHaveContent(files: File[] | FileList): boolean {
  return Array.from(files).every((f) => f.size > 0);
}

function isAudio(file: Blob) {
  return file.type === "" || file.type.startsWith("audio");
}

export type FileWithInfo = {
  name: string;
  data: ArrayBuffer;
};

export type FileDataLoader = () => Promise<FileWithInfo>;
export type FileDataLoaders = FileDataLoader[];

type BaseOptions = {
  colors: VisualisationColors;
};

type SingleParamsAnalysisOptions = {
  bpm: BpmOptions;
  scale: ScaleOptions;
  thresholds: ThresholdOptions;
} & BaseOptions;

export type SingleAnalysisOptions = {
  fileLoader: FileDataLoader;
} & SingleParamsAnalysisOptions;

export type BatchFileAnalysisOptions = {
  fileLoaders: FileDataLoaders;
} & SingleParamsAnalysisOptions &
  BaseOptions;

export type BatchParamAnalysisOptions = {
  bpm: BpmOptions;
  fileLoader: FileDataLoader;
} & BaseOptions;

export type ScaleOptions =
  | "log"
  | "sqrt"
  | "linear"
  | "squared"
  | "exponential";

export type ThresholdOptions = {
  min: number;
  max: number;
};

export type VisualisationColors = {
  similar: string;
  diff: string;
};

export type BpmOptions = {
  autodetect: boolean;
  autodetectMultiplier: number;
  value: number;
};
