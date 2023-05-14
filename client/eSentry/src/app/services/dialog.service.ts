import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  newMonitorDialog:Subject<boolean> = new Subject<boolean>();

  constructor() { }
  
  getNewMonitorDialog():Observable<boolean>{
    return this.newMonitorDialog.asObservable();
  }

  closeNewMonitorDialog() {
    this.newMonitorDialog.next(false);
  }
}
