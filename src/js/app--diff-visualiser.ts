import { MutableStatus } from './lib--mutable-status';
import { TaskPromiseWorker } from './lib--task-promise-worker';
import { VisualisationColors, ThresholdOptions, ScaleOptions } from './view--analysis-form';
import { BatchImage } from './view--vis-batch';

type DiffVisualiserArgs = {
  context: CanvasRenderingContext2D,
  status: MutableStatus
}

type SingleDiffVisualiserRenderArgs = {
  diffs: Float32Array,
  thresholds: ThresholdOptions,
  scale: ScaleOptions,
  colors: VisualisationColors
}

type MultiDiffVisualiserRenderArgs = {
  diffs: Float32Array,
  matrixParams: {
    scales: ScaleOptions[],
    minThresholds: number[],
    maxThresholds: number[]
  },
  colors: VisualisationColors
}

export class DiffVisualiser {
  context: CanvasRenderingContext2D;
  status: MutableStatus;
  constructor({
    context,
    status
  }: DiffVisualiserArgs) {
    this.context = context;
    this.status = status;
  }

  async renderVisualisation({
    diffs, thresholds, scale, colors
  }: SingleDiffVisualiserRenderArgs) {

    const task = new TaskPromiseWorker('/js/workers/w--renderer.js');

    this.status.update({
      status: 'Generating visualisation ',
      task
    });

    const data = await task
      .run({
        diffs: diffs.buffer,
        colors: colors,
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
    diffs, matrixParams, colors
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
        colors: colors,
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

