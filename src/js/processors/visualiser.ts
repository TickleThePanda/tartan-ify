import { MutableStatus } from "../views/status";
import { TaskPromiseWorker } from "./tool--task-promise-worker";
import {
  VisualisationColors,
  ThresholdOptions,
  ScaleOptions as ScaleOption,
} from "../views/analysis-form";

type DiffVisualiserArgs = {
  context: CanvasRenderingContext2D;
  status: MutableStatus;
};

type SingleDiffVisualiserRenderArgs = {
  diffs: Float32Array;
  thresholds: ThresholdOptions;
  scale: ScaleOption;
  colors: VisualisationColors;
};

export type MatrixParam = {
  scale: ScaleOption;
  minThreshold: number;
  maxThreshold: number;
};

type MultiDiffVisualiserRenderArgs = {
  diffs: Float32Array;
  matrixParams: MatrixParam[];
  colors: VisualisationColors;
};

type MultiDiffVisualiserResult = {
  context: MatrixParam;
  imageData: Uint8ClampedArray;
};

export class DiffVisualiser {
  context: CanvasRenderingContext2D;
  status: MutableStatus;
  constructor({ context, status }: DiffVisualiserArgs) {
    this.context = context;
    this.status = status;
  }

  async renderVisualisation({
    diffs,
    thresholds,
    scale,
    colors,
  }: SingleDiffVisualiserRenderArgs): Promise<Uint8ClampedArray> {
    const task = new TaskPromiseWorker("/js/workers/w--renderer.js");

    this.status.update({
      status: "Generating visualisation ",
      task,
    });

    const data = <ArrayBuffer>await task.run({
      diffs: diffs.buffer,
      colors: colors,
      thresholds,
      scale,
    });

    return new Uint8ClampedArray(data);
  }

  async renderVisualisations({
    diffs,
    matrixParams,
    colors,
  }: MultiDiffVisualiserRenderArgs): Promise<MultiDiffVisualiserResult[]> {
    const task = new TaskPromiseWorker("/js/workers/w--renderer.js");

    this.status.update({
      status: "Generating visualisations",
      task,
    });

    type VisualiserResults = {
      data: ArrayBuffer;
      context: MatrixParam;
    }[];

    const results = <VisualiserResults>await task.run({
      diffs: diffs.buffer,
      colors: colors,
      matrixParams,
    });

    return await results.map(({ data, context }) => ({
      imageData: new Uint8ClampedArray(data),
      context,
    }));
  }
}
