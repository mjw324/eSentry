import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Monitor } from 'src/app/models/monitor.model';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';


@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.css']
})
export class MonitorListComponent implements OnInit, OnDestroy {

  monitors: Monitor[] = [];
  intervalID: any;
  monitorSubscription: Subscription = new Subscription();
  constructor(public monitorService: MonitorService, public userService: UserService) { }

  ngOnInit(): void {
    this.intervalID = setInterval(() => {
      this.monitorService.fetchMonitors(this.userService.getCurrentUserID())
    }, 10000)

    this.monitorSubscription = this.monitorService.getMonitors().subscribe({
      next: (monitors) => {
        this.monitors = monitors;
      }
    });

    this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
  }

  ngOnDestroy(): void {
    this.monitorSubscription.unsubscribe();
    clearInterval(this.intervalID);
  }
}
