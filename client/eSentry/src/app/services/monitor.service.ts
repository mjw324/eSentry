import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Monitor } from '../models/monitor.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';
import { ItemStatistics } from '../models/item-statistics.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private monitors: Subject<Monitor[]> = new Subject<Monitor[]>();
  // This is a private cache of monitors to avoid unnecessary API calls and make retrieval faster
  private monitorsCache: Monitor[] = [];
  constructor(private http: HttpClient) {}

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  fetchMonitors(userid: string): void {
    this.http.get<Monitor[]>(`${environment.url}/monitors`, { headers: { userid } })
      .subscribe(monitors => {
        this.monitors.next(monitors);
        this.monitorsCache = monitors;
      });
  }

  addMonitor(request: MonitorRequest, userid: string): Observable<Monitor> {
    return this.http.post<Monitor>(`${environment.url}/monitors`, request, { headers: new HttpHeaders({ userid }) })
      .pipe(tap(() => this.fetchMonitors(userid)));
  }

  checkItem(request: MonitorRequest, userid: string): Observable<ItemStatistics> {
    return this.http.post<ItemStatistics>(`${environment.url}/itemStatistics`, request, { headers: new HttpHeaders({ userid })});
  }

  deleteMonitor(monitorId: number, userid: string): Observable<any> {
    return this.http.delete(`${environment.url}/monitors/${monitorId}`, { headers: new HttpHeaders({ userid })});
  }

  updateMonitorStatus(monitorId: number, userid: string, status: boolean): Observable<any> {
    const url = `${environment.url}/monitors/${monitorId}/status`;
    const body = { active: status };
    const headers = new HttpHeaders({ userid });

    return this.http.patch(url, body, { headers });
  }

  // Skips API call and directly retrieves monitor from cache
  getMonitorByIdDirect(monitorId: number): Monitor | undefined {
    return this.monitorsCache.find(monitor => monitor.id === monitorId);
  }

  updateMonitor(monitorId: number, request: MonitorRequest, userid: string): Observable<any> {
    const url = `${environment.url}/monitors/${monitorId}`;
    const headers = new HttpHeaders({ userid });
    return this.http.patch(url, request, { headers }).pipe(
      tap(() => this.fetchMonitors(userid)) // Refresh the monitors list after updating
    );
  }
}
