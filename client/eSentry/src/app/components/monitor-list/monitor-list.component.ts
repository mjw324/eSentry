import { Component, OnInit } from '@angular/core';
import { Monitor } from 'src/app/models/monitor.model';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';


@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.css']
})
export class MonitorListComponent implements OnInit {

  monitors$ = this.monitorService.getMonitors();
  intervalID: any;

  constructor(public monitorService: MonitorService, public userService: UserService) { }

  ngOnInit(): void {
    this.intervalID = setInterval(() => {
      this.monitorService.fetchMonitors(this.userService.getCurrentUserID())
    }, 10000);
    this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
  }

  deleteMonitor(monitorId: number) {
    const userId = this.userService.getCurrentUserID();
    this.monitorService.deleteMonitor(monitorId, userId).subscribe({
      next: () => this.monitorService.fetchMonitors(userId),
      error: (error) => console.error('Error deleting monitor:', error)
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalID);
  }
}