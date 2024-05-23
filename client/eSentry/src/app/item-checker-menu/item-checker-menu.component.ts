import { Component } from '@angular/core';
import { MonitorRequest } from 'src/app/models/monitor-request.model';
import { DialogService } from 'src/app/services/dialog.service';
import { MonitorService } from 'src/app/services/monitor.service';
import { UserService } from 'src/app/services/user.service';
import { ItemStatistics } from 'src/app/models/item-statistics.model';

@Component({
  selector: 'app-item-checker-menu',
  templateUrl: './item-checker-menu.component.html',
  styleUrls: ['./item-checker-menu.component.css']
})
export class ItemCheckerMenuComponent {
  keywords: string[] = [];
  seller: string = '';
  minPrice = 0;
  maxPrice = 0;
  excludeKeywords: string[] = [];
  selectedConditions: string[] = [];
  conditionOptions = [
    { label: 'New', value: 'new' },
    { label: 'Open Box', value: 'open_box' },
    { label: 'Used', value: 'used' }
  ];
  histogramData: any;
  isRequesting: boolean = false;
  itemStatistics: ItemStatistics | null = null;

  constructor(
    public monitorService: MonitorService,
    public dialogService: DialogService, 
    private userService: UserService
  ) {}

  saveMonitor() {
    if (this.keywords.length <= 0 && this.seller == '') {
      console.error('Either keywords or seller is required');
      return;
    }
    this.isRequesting = true; // Start request
    const monitorRequest: MonitorRequest = {
      keywords: this.keywords.length > 0 ? this.keywords.join(' ') : null,
      seller: this.seller != '' ? this.seller : null,
      min_price: this.minPrice > 0 ? this.minPrice : null,
      max_price: this.maxPrice > 0 ? this.maxPrice : null,
      exclude_keywords: this.excludeKeywords.length > 0 ? this.excludeKeywords.join(' ') : null,
      condition_new: this.selectedConditions.includes('new'),
      condition_open_box: this.selectedConditions.includes('open_box'),
      condition_used: this.selectedConditions.includes('used'),
    };

    this.monitorService.checkItem(monitorRequest, this.userService.getCurrentUserID()).subscribe({
      next: (stats) => {
        this.itemStatistics = stats; // Store the entire stats response
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
        this.isRequesting = false; // End request
      },
      error: (error) => {
        console.error('Failed to check item statistics', error);
        this.isRequesting = false; // End request
      }
    });
  }

  isValidMonitor() {
    // Ensure keywords and/or seller is provided
    if (this.keywords.length <= 0 && this.seller == '') {
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
    this.seller = '';
    this.minPrice = 0;
    this.maxPrice = 0;
    this.excludeKeywords = [];
    this.selectedConditions = [];
  }
}
