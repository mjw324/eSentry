import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
    return this.http.post<Monitor>(environment.url + '/monitors', request)
      .pipe(
        tap(() => this.fetchMonitors(userid)),
        catchError(error => {
          this.messageService.add({severity: "error", summary: "Error", detail: error.message});
          return throwError(() => new Error(error.message));
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
}
