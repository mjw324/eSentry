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

  constructor(public monitorService: MonitorService, public userService: UserService) { }

  ngOnInit(): void {
    this.intervalID = setInterval(() => {
      this.monitorService.fetchMonitors(this.userService.getCurrentUserID())
    }, 10000);
    this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
  }

  updateMonitorStatus(monitorId: number, status: number): void {
    const userId = this.userService.getCurrentUserID();
    this.monitorService.updateMonitorStatus(monitorId, userId, status === 1).subscribe({
      next: () => {
        // Operation was successful, you might want to do something here or nothing at all
      },
      error: (error) => {
        console.error('You can only have 2 monitors active at a time!');
        // Refresh the list of monitors to revert the toggle state
        this.monitorService.fetchMonitors(userId);
        // Optionally, show an error message to the user
      }
    });
  }
  
  onSwitchChange(monitorId: number, isChecked: boolean): void {
    const newStatus = isChecked ? 1 : 0; // Convert boolean back to number
    this.updateMonitorStatus(monitorId, newStatus);
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