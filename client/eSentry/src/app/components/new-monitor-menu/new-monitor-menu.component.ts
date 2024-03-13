import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { Monitor } from 'src/app/models/monitor.model';

@Component({
  selector: 'app-new-monitor-menu',
  templateUrl: './new-monitor-menu.component.html',
  styleUrls: ['./new-monitor-menu.component.css']
})
export class NewMonitorMenuComponent {
  keywords: string[] = [];
  telegramID = "";
  minPrice = 0;
  maxPrice = 0;
  excludeKeywords: string[] = [];
  selectedConditions: string[] = [];
  conditionOptions = [
    { label: 'New', value: 'new' },
    { label: 'Open Box', value: 'open_box' },
    { label: 'Used', value: 'used' }
  ];

  constructor(public monitorService: MonitorService,
    public dialogService: DialogService, private userService: UserService) { }
  
  // This is to edit the monitor details
  populateForm(monitor: Monitor) {
    // Populates the form here
    this.keywords = monitor.keywords.split(' ');
    this.telegramID = monitor.chatid.toString();
    this.minPrice = monitor.min_price || 0;
    this.maxPrice = monitor.max_price || 0;
    this.excludeKeywords = monitor.exclude_keywords ? monitor.exclude_keywords.split(' ') : [];
    this.selectedConditions = [];
    if (monitor.condition_new) this.selectedConditions.push('new');
    if (monitor.condition_open_box) this.selectedConditions.push('open_box');
    if (monitor.condition_used) this.selectedConditions.push('used');
  }

  saveMonitor() {
    // required fields
    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.join(' '),
      chatid: this.telegramID,
      active: false
    };

    if (this.minPrice > 0) {
      monitorRequest.min_price = this.minPrice;
    }
    if (this.maxPrice > 0) {
      monitorRequest.max_price = this.maxPrice;
    }
    if (this.excludeKeywords.length > 0) {
      monitorRequest.exclude_keywords = this.excludeKeywords.join(' ');
    }
    if (this.selectedConditions.includes('new')) {
      monitorRequest.condition_new = true;
    }
    if (this.selectedConditions.includes('open_box')) {
      monitorRequest.condition_open_box = true;
    }
    if (this.selectedConditions.includes('used')) {
      monitorRequest.condition_used = true;
    }

    this.monitorService.addMonitor(monitorRequest, this.userService.getCurrentUserID())
    .subscribe({
        next: (monitor) => {
            // After a successful POST, we reset the form and close the dialog menu
            console.log('Monitor added:', monitor);
            this.resetForm();
            this.dialogService.closeNewMonitorDialog();
        }
    });
  }

  isValidMonitor() {

    // Telegram ID and keywords are required
    if (!(this.keywords.length > 0 && this.telegramID !== '' && this.telegramID !== null)) return false;

    if (this.minPrice > 0 && this.maxPrice > 0) {
      return this.maxPrice > this.minPrice;
    }
    
    // Requirements passed at this point
    return true;
  }

  resetForm() {
    this.keywords = [];
    this.telegramID = "";
    this.minPrice = 0;
    this.maxPrice = 0;
    this.excludeKeywords = [];
    this.selectedConditions = [];
  }
}
