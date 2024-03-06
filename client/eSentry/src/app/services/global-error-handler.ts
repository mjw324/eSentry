import { ErrorHandler, Injectable } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private errorHandlerService: ErrorHandlerService) {}

  handleError(error: any) {
    this.errorHandlerService.handleError(error);
    // Log the error to the console
    console.error('Global error handler:', error);
  }
}
