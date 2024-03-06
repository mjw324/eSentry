import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(private messageService: MessageService) {}

  handleError(error: any) {
    let errorMessage: string = 'An unexpected error occurred';

    if (error instanceof HttpErrorResponse) {
      // Handle server-side error
      console.log(error);
      errorMessage = error.error.message || error.error;
    } else {
      // Handle client-side error
      return;
    }

    this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
  }
}
