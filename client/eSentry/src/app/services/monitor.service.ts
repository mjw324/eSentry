import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Monitor } from '../models/monitor.model';
import { HttpClient } from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {

  monitors: Subject<Monitor[]> = new Subject<Monitor[]>();

  constructor(public http: HttpClient) { }

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  fetchMonitors() {
    this.http.get<Monitor[]>('http://localhost:3000/monitors').subscribe(monitors => {
      this.monitors.next(monitors);
    });
  }

  addMonitor(request: MonitorRequest) {
    this.http.post<Monitor>('http://localhost:3000/monitors', request).subscribe(monitor => {
      this.fetchMonitors();
    });
  }
}
