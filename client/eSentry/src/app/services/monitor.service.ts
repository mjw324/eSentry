import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Monitor } from '../models/monitor.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  monitors: Subject<Monitor[]> = new Subject<Monitor[]>();

  constructor(private http: HttpClient) {}

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  fetchMonitors(userid: string): void {
    this.http.get<Monitor[]>(`${environment.url}/monitors`, { headers: { userid } })
      .subscribe(monitors => this.monitors.next(monitors));
  }

  addMonitor(request: MonitorRequest, userid: string): Observable<Monitor> {
    return this.http.post<Monitor>(`${environment.url}/monitors`, request, { headers: new HttpHeaders({ userid }) })
      .pipe(tap(() => this.fetchMonitors(userid)));
  }

  deleteMonitor(monitorid: number, userid: string): Observable<any> {
    return this.http.delete(`${environment.url}/monitors/${monitorid}`, { headers: { userid }});
  }

  updateMonitorStatus(monitorId: number, userid: string, status: boolean): Observable<any> {
    const url = `${environment.url}/monitors/${monitorId}/status`;
    const body = { active: status };
    const headers = { headers: new HttpHeaders({ userid }) };

    return this.http.patch(url, body, headers);
  }
}
