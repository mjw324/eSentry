import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { MonitorService } from 'src/app/services/monitor.service';

@Component({
  selector: 'app-new-monitor-menu',
  templateUrl: './new-monitor-menu.component.html',
  styleUrls: ['./new-monitor-menu.component.css']
})
export class NewMonitorMenuComponent {
  keywords = "";

  constructor(public monitorService: MonitorService) { }

  saveKeywords() {
    const keywords: MonitorRequest = { keywords: this.keywords };
    this.monitorService.addMonitor(keywords);
  }
}
