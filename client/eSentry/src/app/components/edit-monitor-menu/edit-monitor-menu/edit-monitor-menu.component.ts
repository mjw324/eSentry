import { Component, OnInit } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { Monitor } from 'src/app/models/monitor.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { ItemStatistics } from 'src/app/models/item-statistics.model';

@Component({
  selector: 'app-edit-monitor-menu',
  templateUrl: './edit-monitor-menu.component.html',
  styleUrls: ['./edit-monitor-menu.component.css']
})
export class EditMonitorMenuComponent implements OnInit {
  keywords: string[] = [];
  telegramID = '';
  email = '';
  minPrice = 0;
  maxPrice = 0;
  excludeKeywords: string[] = [];
  selectedConditions: string[] = [];
  conditionOptions = [
    { label: 'New', value: 'new' },
    { label: 'Open Box', value: 'open_box' },
    { label: 'Used', value: 'used' }
  ];
  monitor: Monitor | null = null; // The monitor being edited
  isRequesting: boolean = false;

  constructor(
    private monitorService: MonitorService,
    private dialogService: DialogService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.dialogService.getEditMonitorData().subscribe((monitor: Monitor | null) => {
      // If a monitor is passed, populate the form with its data
      if (monitor) {
        this.monitor = monitor;
        this.populateForm(monitor);
      }
    });
  }
  

  populateForm(monitor: Monitor) {
    this.keywords = monitor.keywords.split(' ');
    this.telegramID = monitor.chatid == undefined ? '' : monitor.chatid;
    this.email = monitor.email == undefined ? '' : monitor.email;
    this.minPrice = monitor.min_price || 0;
    this.maxPrice = monitor.max_price || 0;
    this.excludeKeywords = monitor.exclude_keywords ? monitor.exclude_keywords.split(' ') : [];
    this.selectedConditions = [];
    if (monitor.condition_new) this.selectedConditions.push('new');
    if (monitor.condition_open_box) this.selectedConditions.push('open_box');
    if (monitor.condition_used) this.selectedConditions.push('used');
  }

  saveMonitor() {
    if (!this.monitor) {
      console.error('No monitor to update');
      return;
    }
    this.isRequesting = true; // Start request
    // Construct the updated monitor request object to send to server to update the monitor
    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.join(' '),
      chatid: this.telegramID === '' ? null : this.telegramID,
      email: this.email === '' ? null : this.email,
      active: this.monitor.active == 1,
      min_price: this.minPrice > 0 ? this.minPrice : null,
      max_price: this.maxPrice > 0 ? this.maxPrice : null,
      exclude_keywords: this.excludeKeywords.length > 0 ? this.excludeKeywords.join(' ') : null,
      condition_new: this.selectedConditions.includes('new'),
      condition_open_box: this.selectedConditions.includes('open_box'),
      condition_used: this.selectedConditions.includes('used'),
      id: this.monitor.id
    };
  
    // Call the update method
    this.monitorService.updateMonitor(this.monitor.id, monitorRequest, this.userService.getCurrentUserID()).subscribe({
      next: (monitor) => {
        // After a successful PATCH, we reset the form and close the dialog menu
        console.log('Monitor updated', monitor);
        this.resetForm();
        this.dialogService.closeEditMonitorDialog();
        this.isRequesting = false; // End request
      },
      error: (error) => {
        console.error('Failed to update monitor', error);
        this.isRequesting = false; // End request
      }
    });
  }

  isValidMonitor() {
    // Regular expression for basic email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  
    // Ensure keywords are provided
    if (this.keywords.length <= 0) {
      return false;
    }
  
    // Ensure at least one notification method is provided and valid
    const isTelegramIDProvided = this.telegramID !== '' && this.telegramID !== null;
    const isEmailProvided = this.email !== '' && this.email !== null;
    const isEmailValid = emailRegex.test(this.email);
    if (!isTelegramIDProvided && !(isEmailProvided && isEmailValid)) {
      return false;
    }
    // Ensure email is valid if provided with Telegram ID
    if(isTelegramIDProvided && isEmailProvided && !isEmailValid) {
      return false;
    }
  
    // Validate price range if both prices are provided
    if (this.minPrice > 0 && this.maxPrice > 0 && this.maxPrice <= this.minPrice) {
      // Ensure maxPrice is greater than minPrice
      return false;
    }
    
    // All validations passed
    return true;
  }
  
  

  resetForm() {
    this.keywords = [];
    this.telegramID = '';
    this.email = '';
    this.minPrice = 0;
    this.maxPrice = 0;
    this.excludeKeywords = [];
    this.selectedConditions = [];
  }
}
