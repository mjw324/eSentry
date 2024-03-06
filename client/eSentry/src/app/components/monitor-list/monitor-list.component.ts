import { Component, OnInit } from '@angular/core';
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

  constructor(
    public monitorService: MonitorService, 
    public userService: UserService
  ) {}

  ngOnInit(): void {
    this.intervalID = setInterval(() => {
      this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
    }, 10000);
    this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
  }

  updateMonitorStatus(monitorId: number, status: boolean): void {
    const userId = this.userService.getCurrentUserID();
    this.monitorService.updateMonitorStatus(monitorId, userId, status).subscribe({
      next: () => {
        // Operation was successful, you might want to refresh or update UI accordingly
      }
    });
  }
  
  onSwitchChange(monitorId: number, isChecked: boolean): void {
    this.updateMonitorStatus(monitorId, isChecked);
  }
  
  deleteMonitor(monitorId: number) {
    const userId = this.userService.getCurrentUserID();
    this.monitorService.deleteMonitor(monitorId, userId).subscribe({
      next: () => this.monitorService.fetchMonitors(userId)
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalID);
  }
}
