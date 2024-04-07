import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-new-monitor-menu',
  templateUrl: './new-monitor-menu.component.html',
  styleUrls: ['./new-monitor-menu.component.css']
})
export class NewMonitorMenuComponent {
  histogramData: any;
  keywords: string[] = [];
  telegramID = '';
  email = ''; // Add the email property
  minPrice = 0;
  maxPrice = 0;
  excludeKeywords: string[] = [];
  selectedConditions: string[] = [];
  conditionOptions = [
    { label: 'New', value: 'new' },
    { label: 'Open Box', value: 'open_box' },
    { label: 'Used', value: 'used' }
  ];

  constructor(
    public monitorService: MonitorService,
    public dialogService: DialogService, 
    private userService: UserService
  ) {}

  saveMonitor() {
    // Ensure at least one notification method is provided along with keywords
    if (!(this.keywords.length > 0 && (this.telegramID !== '' || this.email !== ''))) {
      console.error('Either Telegram ID or Email is required along with keywords');
      return;
    }

    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.join(' '),
      chatid: this.telegramID === '' ? null : this.telegramID, // Handle empty string as null
      email: this.email === '' ? null : this.email, // Include the email in the request
      active: false, // Default to inactive when creating a new monitor
      // Include other fields as necessary
      min_price: this.minPrice > 0 ? this.minPrice : null,
      max_price: this.maxPrice > 0 ? this.maxPrice : null,
      exclude_keywords: this.excludeKeywords.length > 0 ? this.excludeKeywords.join(' ') : null,
      condition_new: this.selectedConditions.includes('new'),
      condition_open_box: this.selectedConditions.includes('open_box'),
      condition_used: this.selectedConditions.includes('used'),
    };

    this.monitorService.addMonitor(monitorRequest, this.userService.getCurrentUserID()).subscribe({
      next: (monitor) => {
        console.log('Monitor added:', monitor);
        this.resetForm();
        this.dialogService.closeNewMonitorDialog();
      },
      error: (error) => console.error('Failed to add monitor', error)
    });
  }

  checkItemStatistics() {
    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.join(' '),
      chatid: this.telegramID === '' ? null : this.telegramID,
      email: this.email === '' ? null : this.email,
      min_price: this.minPrice > 0 ? this.minPrice : null,
      max_price: this.maxPrice > 0 ? this.maxPrice : null,
      exclude_keywords: this.excludeKeywords.length > 0 ? this.excludeKeywords.join(' ') : null,
      condition_new: this.selectedConditions.includes('new'),
      condition_open_box: this.selectedConditions.includes('open_box'),
      condition_used: this.selectedConditions.includes('used'),
    };

    this.monitorService.checkItem(monitorRequest, this.userService.getCurrentUserID()).subscribe({
      next: (stats) => {
        this.histogramData = {
          labels: stats.priceDistribution.map(item => item.priceRange),
          datasets: [
            {
              data: stats.priceDistribution.map(item => item.count),
              backgroundColor: ['#3C6E71'],
              label: 'Price distribution'
            }
          ]
        };
      },
      error: (error) => console.error('Failed to check item statistics', error),
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
