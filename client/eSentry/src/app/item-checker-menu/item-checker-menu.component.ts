import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-item-checker-menu',
  templateUrl: './item-checker-menu.component.html',
  styleUrls: ['./item-checker-menu.component.css']
})
export class ItemCheckerMenuComponent {
  keywords: string[] = [];
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
    private userService: UserService,
    private messageService: MessageService
  ) {}

  saveMonitor() {
    // Ensure at least one notification method is provided along with keywords
    if (!(this.keywords.length > 0)) {
      console.error('Either Telegram ID or Email is required along with keywords');
      return;
    }

    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.join(' '),
      // Include other fields as necessary
      min_price: this.minPrice > 0 ? this.minPrice : null,
      max_price: this.maxPrice > 0 ? this.maxPrice : null,
      exclude_keywords: this.excludeKeywords.length > 0 ? this.excludeKeywords.join(' ') : null,
      condition_new: this.selectedConditions.includes('new'),
      condition_open_box: this.selectedConditions.includes('open_box'),
      condition_used: this.selectedConditions.includes('used'),
    };

    this.monitorService.checkItem(monitorRequest, this.userService.getCurrentUserID()).subscribe({
      next: (stats) => {
        this.resetForm();
        this.dialogService.closeCheckItemDialog();
        // Display statistics in a pop-up box
        this.messageService.add({
          severity: 'info',
          summary: 'Item Statistics',
          detail: `Average Price: ${stats.averagePrice}\n Min Price: ${stats.minPrice}\n Max Price: ${stats.maxPrice}\n Volume Last Month: ${stats.volumeLastMonth}\n Volume Last Year: ${stats.volumeLastYear}`,
        });
      },
      error: (error) => {
        // Handle error
        console.error('Error fetching item statistics:', error);
      },
    });
  }

  isValidMonitor() {
    // Ensure keywords are provided
    if (this.keywords.length <= 0) {
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
    this.minPrice = 0;
    this.maxPrice = 0;
    this.excludeKeywords = [];
    this.selectedConditions = [];
  }
}
