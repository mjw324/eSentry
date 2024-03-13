import { Component, OnInit, OnDestroy } from '@angular/core';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { MenuItem } from 'primeng/api';
import { DialogService } from 'src/app/services/dialog.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.css']
})
export class MonitorListComponent implements OnInit {

  monitors$ = this.monitorService.getMonitors();
  private itemsCache = new Map<number, MenuItem[]>();
  private dialogSubscription: Subscription | null = null;
  intervalID: any;
  showDialog = false;

  constructor(
    public monitorService: MonitorService, 
    public userService: UserService,
    public dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.intervalID = setInterval(() => {
      this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
    }, 10000);
    this.monitorService.fetchMonitors(this.userService.getCurrentUserID());
    
    // Subscribe to the editMonitorDialog observable to control the showDialog state
    this.dialogSubscription = this.dialogService.getEditMonitorDialog().subscribe(show => {
      this.showDialog = show; // Update the showDialog state based on the observable's value
    });
  }

  getConditionLabels(monitor: any): string {
    const conditions = [];
    if (monitor.condition_new) conditions.push('New');
    if (monitor.condition_open_box) conditions.push('Open Box');
    if (monitor.condition_used) conditions.push('Used');
    return conditions.length > 0 ? conditions.join(', ') : 'None';
  }
  

  ngOnDestroy(): void {
    clearInterval(this.intervalID);
  
    // Unsubscribe, preventing memory leaks
    if (this.dialogSubscription) {
      this.dialogSubscription.unsubscribe();
    }
  }

  updateMonitorStatus(monitorId: number, status: boolean): void {
    const userId = this.userService.getCurrentUserID();
    this.monitorService.updateMonitorStatus(monitorId, userId, status).subscribe({
      next: () => {}
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
    
  items(monitorId: number): MenuItem[] {
    if (!this.itemsCache.has(monitorId)) {
      const items: MenuItem[] = [
        {
          label: 'Edit',
          icon: 'pi pi-pencil',
          command: () => {
            this.editMonitor(monitorId);
          }
        },
        {
          label: 'Delete',
          icon: 'pi pi-trash',
          command: () => {
            this.deleteMonitor(monitorId);
          }
        }
      ];
      this.itemsCache.set(monitorId, items);
    }
    const items = this.itemsCache.get(monitorId);
    return items ? items : [];
  }
  

  editMonitor(monitorId: number): void {
    const monitor = this.monitorService.getMonitorByIdDirect(monitorId); // Direct access via locally stored monitor data
  
    if (monitor) {
      this.dialogService.openEditMonitorDialog(monitor);
      this.showDialog = true;
    }
  }
  
}
