import { MutableStatus } from './lib--mutable-status.js';
import { TaskPromiseWorker } from './lib--task-promise-worker.js';
import { VisualisationColors, ThresholdOptions, ScaleOptions } from './view--analysis-form.js';
import { BatchImage } from './view--vis-batch.js';

type DiffVisualiserArgs = {
  colors: VisualisationColors,
  context: CanvasRenderingContext2D,
  status: MutableStatus
}

type SingleDiffVisualiserRenderArgs = {
  diffs: Float32Array,
  thresholds: ThresholdOptions,
  scale: ScaleOptions
}

type MultiDiffVisualiserRenderArgs = {
  diffs: Float32Array,
  matrixParams: {
    scales: ScaleOptions[],
    minThresholds: number[],
    maxThresholds: number[]
  }
}

export class DiffVisualiser {
  colors: VisualisationColors;
  context: CanvasRenderingContext2D;
  status: MutableStatus;
  constructor({
    colors,
    context,
    status
  }: DiffVisualiserArgs) {
    this.context = context;
    this.colors = colors;
    this.status = status;
  }

  async renderVisualisation({
    diffs, thresholds, scale
  }: SingleDiffVisualiserRenderArgs) {

    const task = new TaskPromiseWorker('/js/workers/workers--renderer.js');

    this.status.update({
      status: 'Generating visualisation ',
      task
    });

    const data = await task
      .run({
        diffs: diffs.buffer,
        colors: this.colors,
        thresholds,
        scale
      });

    const array = new Uint8ClampedArray(data);

    const widthFromRender = Math.sqrt(array.length / 4);

    const image = this.context.createImageData(widthFromRender, widthFromRender);

    image.data.set(array);

    const imageData = await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender);

    return imageData;
  }

  async renderVisualisations({
    diffs, matrixParams
  }: MultiDiffVisualiserRenderArgs): Promise<BatchImage[]> {

    const task = new TaskPromiseWorker('/js/workers/w--renderer.js');

    this.status.update({
      status: 'Generating visualisations',
      task
    });

    const results: {
      data: ArrayBuffer,
      title: string
    }[] = await task
      .run({
        diffs: diffs.buffer,
        colors: this.colors,
        matrixParams
      });

    return await Promise.all(results.map(async ({data, title}) => {
      const array = new Uint8ClampedArray(data);

      const widthFromRender = Math.sqrt(array.length / 4);

      const image = this.context.createImageData(widthFromRender, widthFromRender);

      image.data.set(array);

      return {
        title,
        imageData: await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender)
      }
    }));

  }
}

