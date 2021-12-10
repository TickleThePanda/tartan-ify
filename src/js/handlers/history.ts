import { BatchVisualisationPainter } from '../views/vis-batch';
import { MutableStatus } from '../views/status';
import { AnalysisStore } from '../stores/analyis';
import { PageManager } from '../views/page-handler';

export class HistoryHandler {

  constructor(
    private pages: PageManager,
    private visPainter: BatchVisualisationPainter,
    private stage: MutableStatus,
    private cache: AnalysisStore
  ) { }

  async handleHistory({ }): Promise<void> {

    this.pages.showLoading();

    this.stage.update({
      status: `Loading history`
    });

    const cached = await this.cache.getAllByCreationDate();

    const images = await Promise.all(
      cached.map(async (i) => ({
        title: {
          header: i.trackName,
          context: {
            "Scale": i.scale,
            "Max": `${i.minThreshold}`,
            "Min": `${i.maxThreshold}`,
            "BPM": !i.bpmOptions.autodetect
              ? `${i.bpmOptions.value}`
              : i.bpmOptions.autodetectMultiplier !== undefined
                ? `auto ${i.bpmOptions.autodetectMultiplier}`
                : `auto`,
          }
        },
        imageData: new Uint8ClampedArray(await i.image.arrayBuffer())
      }))
    );

    images.reverse();

    this.pages.showVisualisation(this.visPainter);
    this.visPainter.start(images, "History");
  }
}
