import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';

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

  saveMonitor() {
    // required fields
    const monitorRequest: MonitorRequest = {
      userid: this.userService.getCurrentUserID(),
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
            console.log('Monitor added:', monitor);
            this.resetForm();
            this.dialogService.closeNewMonitorDialog();
        },
        error: (error) => {
            console.error('Error adding monitor:', error);
        }
    });
  }

  isValidMonitor() {
    let requiredFields = this.keywords.length > 0 && this.telegramID !== '';

    // Check if maxPrice is greater than minPrice, only if both are non-zero
    let priceCheck = true;
    if (this.minPrice > 0 && this.maxPrice > 0) {
      priceCheck = this.maxPrice > this.minPrice;
    }

    // Return true only if both checks pass
    return requiredFields && priceCheck;
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
