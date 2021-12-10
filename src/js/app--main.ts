import { CanvasSizeManager } from "./views/canvas-size-manager";
import { AnalysisFormManager } from "./views/analysis-form";
import { SingleVisualisationPainter } from "./views/vis-single";
import { BatchVisualisationPainter } from "./views/vis-batch";
import { MusicAnalyser, DiffVisualiser, AudioExtractor } from "./processors";
import { StatusView, MutableStatus } from "./views/status";
import { PageManager } from "./views/page-handler";
import { AnalysisStore } from "./stores";
import {
  SingleAnalysisHandler,
  BatchFileAnalysisHandler,
  BatchParamsAnalysisHandler,
  HistoryHandler,
} from "./handlers";

function requiredElementById(element: string): HTMLElement {
  return (
    document.getElementById(element) ??
    (() => {
      throw new Error("Required element " + element);
    })()
  );
}

window.addEventListener("load", async () => {
  const stage = new MutableStatus();

  const statusManager = new StatusView(
    {
      wrapper: requiredElementById("loading-status"),
      status: requiredElementById("loading-status-status"),
      task: requiredElementById("loading-status-task"),
      percentage: requiredElementById("loading-status-percentage"),
      context: requiredElementById("loading-status-context"),
    },
    stage
  );

  const visualiser = requiredElementById("visualiser");
  const batchElement = requiredElementById("batch");
  const canvas = <HTMLCanvasElement>requiredElementById("similarity-graph");
  const context =
    canvas.getContext("2d") ??
    (() => {
      throw new Error("Unable to get context");
    })();

  const formManager = new AnalysisFormManager(
    requiredElementById("music-form"),
    await loadAudioSelection()
  );

  const canvasSizeManager = new CanvasSizeManager();
  canvasSizeManager.add(canvas);

  const diffVisualiser = new DiffVisualiser({
    context: context,
    status: stage,
  });

  const singleVisPainter = new SingleVisualisationPainter({
    wrapper: visualiser,
    canvas,
    context,
    canvasSizeManager,
  });

  const batchVisualiserPainter = new BatchVisualisationPainter(batchElement);
  const audioExtractor = new AudioExtractor(stage);
  const musicAnalyser = new MusicAnalyser(stage);
  const cache = new AnalysisStore();

  const pageManager = new PageManager(formManager, statusManager);

  const singleAnalysisHandler = new SingleAnalysisHandler(
    pageManager,
    singleVisPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );
  const batchFileAnalysisHandler = new BatchFileAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );
  const batchParamsAnalysisHandler = new BatchParamsAnalysisHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    diffVisualiser,
    musicAnalyser,
    audioExtractor,
    cache
  );
  const historyHandler = new HistoryHandler(
    pageManager,
    batchVisualiserPainter,
    stage,
    cache
  );

  function logErrors<A>(f: (v: A) => any): (v: A) => Promise<any> {
    return async (...v) => {
      try {
        return await f(...v);
      } catch (e: any) {
        console.log(e, e.stack ?? "No stack trace");
      }
    };
  }

  formManager.registerSingleSubmitListener(
    logErrors((args) => singleAnalysisHandler.analyse(args))
  );
  formManager.registerBatchFileSubmitListener(
    logErrors((args) => batchFileAnalysisHandler.analyse(args))
  );
  formManager.registerBatchParamSubmitListener(
    logErrors((args) => batchParamsAnalysisHandler.analyse(args))
  );
  formManager.registerHistoryListener(
    logErrors((args) => historyHandler.handleHistory(args))
  );

  async function loadAudioSelection() {
    const audioResponse = await fetch("/audio/audio.json");
    return await audioResponse.json();
  }
});
