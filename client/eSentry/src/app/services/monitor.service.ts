import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Monitor } from '../models/monitor.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';
import { environment } from 'src/environments/environment';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  monitors: Subject<Monitor[]> = new Subject<Monitor[]>();

  constructor(private http: HttpClient, private messageService: MessageService) {}

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  fetchMonitors(userid: string): void {
    this.http.get<Monitor[]>(environment.url + '/monitors', { headers: { userid } })
      .pipe(
        catchError(error => {
          this.messageService.add({severity: "error", summary: "Error", detail: error.message});
          this.monitors.next([]);
          return throwError(() => new Error(error.message));
        })
      )
      .subscribe(monitors => this.monitors.next(monitors));
  }

  addMonitor(request: MonitorRequest, userid: string): Observable<Monitor> {
    return this.http.post<Monitor>(`${environment.url}/monitors`, request, { headers: new HttpHeaders({ userid }) })
      .pipe(
        tap(() => this.fetchMonitors(userid)),
        catchError(error => {
          // Extracting the custom error message from the server's response
          const errorMessage = 'No inappropriate keywords allowed';
          this.messageService.add({ severity: "error", summary: "Error", detail: error.message });
  
          // Use the custom error message for the thrown error as well
          return throwError(() => new Error(errorMessage));
        })
      );
  }
  

  deleteMonitor(monitorid: number, userid: string): Observable<any> {
    return this.http.delete(environment.url + '/monitors/' + monitorid, { headers: { userid }})
      .pipe(
        catchError(error => {
          this.messageService.add({severity: "error", summary: "Error", detail: error.message});
          return throwError(() => new Error(error.message));
        })
      );
  }
  updateMonitorStatus(monitorId: number, userid: string, status: boolean): Observable<any> {
    const url = `${environment.url}/monitors/${monitorId}/status`;
    const body = { active: status };
    const headers = { headers: new HttpHeaders({ userid }) };

    return this.http.patch(url, body, headers)
      .pipe(
        catchError(error => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'You can only have 2 monitors active at a time!'});
          return throwError(() => new Error(error.message));
        })
      );
  }
}
