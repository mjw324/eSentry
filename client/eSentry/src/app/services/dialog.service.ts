import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Monitor } from 'src/app/models/monitor.model';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  // Dialog control for adding a new monitor
  private newMonitorDialog: Subject<boolean> = new Subject<boolean>();

  // Dialog control for editing an existing monitor
  private editMonitorDialog: Subject<boolean> = new Subject<boolean>();
  private editMonitorData: Subject<Monitor | null> = new Subject<Monitor | null>();

  constructor() {}

  // Existing methods for handling new monitor dialog
  getNewMonitorDialog(): Observable<boolean> {
    return this.newMonitorDialog.asObservable();
  }

  openNewMonitorDialog() {
    this.newMonitorDialog.next(true);
  }

  closeNewMonitorDialog() {
    this.newMonitorDialog.next(false);
  }

  getEditMonitorDialog(): Observable<boolean> {
    return this.editMonitorDialog.asObservable();
  }

  getEditMonitorData(): Observable<Monitor | null> {
    return this.editMonitorData.asObservable();
  }

  openEditMonitorDialog(monitor: Monitor) {
    this.editMonitorData.next(monitor); // Send the monitor data to be edited
    this.editMonitorDialog.next(true); // Open the dialog
  }
  

  closeEditMonitorDialog() {
    this.editMonitorDialog.next(false);
    this.editMonitorData.next(null); // Clear the data when closing
  }
}
