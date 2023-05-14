import { Component, OnInit } from '@angular/core';
import { Monitor } from 'src/app/models/monitor.model';
import { MonitorService } from 'src/app/services/monitor.service';

@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.css']
})
export class MonitorListComponent implements OnInit{

  monitors:Monitor[] = []
  constructor(public monitorService:MonitorService) { }

  ngOnInit(): void {
    this.monitors = [{id:1,keywords:"3090"}]
    //this.monitorService.fetchMonitors();
    this.monitorService.getMonitors().subscribe(monitors => {
      //this.monitors = monitors;
    });
  }
}
