import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';

@Component({
  selector: 'app-new-monitor-menu',
  templateUrl: './new-monitor-menu.component.html',
  styleUrls: ['./new-monitor-menu.component.css']
})
export class NewMonitorMenuComponent {
  keywords = "";
  telegramID = "";

  constructor(public monitorService: MonitorService,
    public dialogService: DialogService) { }

  saveKeywords() {
    const keywords: MonitorRequest = { keywords: this.keywords, chatID: this.telegramID };
    this.monitorService.addMonitor(keywords);
    this.monitorService.fetchMonitors();
    this.keywords = "";
    this.telegramID = "";
    this.dialogService.closeNewMonitorDialog();
  }
}
