import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Monitor } from 'src/app/models/monitor.model';
import { MonitorService } from 'src/app/services/monitor.service';

@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.css']
})
export class MonitorListComponent implements OnInit, OnDestroy {

  monitors: Monitor[] = [];
  monitorSubscription: Subscription = new Subscription();
  constructor(public monitorService: MonitorService) { }

  ngOnInit(): void {
    //this.monitors = [{id:1,keywords:"3090"}]
    this.monitorService.fetchMonitors();
    this.monitorSubscription = this.monitorService.getMonitors().subscribe(monitors => {
      this.monitors = monitors;
    });
  }

  ngOnDestroy(): void {
    this.monitorSubscription.unsubscribe();
  }
}
