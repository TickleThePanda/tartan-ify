import { AnalysisFormManager } from "./analysis-form";
import { StatusView } from "./status";
import { VisView } from "./vis-view";

export class PageManager {
  constructor(
    private formManager: AnalysisFormManager,
    private statusManager: StatusView
  ) {}

  showLoading(): void {
    this.formManager.hide();
    this.statusManager.start();
    this.statusManager.visible = true;
  }

  showVisualisation(vis: VisView): void {
    this.statusManager.stop();
    this.statusManager.visible = false;
    vis.show();
  }
}
