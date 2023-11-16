import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Monitor } from '../models/monitor.model';
import { HttpClient, HttpParams} from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class MonitorService {

  monitors: Subject<Monitor[]> = new Subject<Monitor[]>();

  constructor(public http: HttpClient) { }

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  fetchMonitors(userid: string) {
    const params = new HttpParams().set('userid', userid);
    this.http.get<Monitor[]>(environment.url + '/monitors', { params }).subscribe(monitors => {
      this.monitors.next(monitors);
    });
  }

  addMonitor(request: MonitorRequest, userid: string) {
    this.http.post<Monitor>(environment.url + '/monitors', request).subscribe(monitor => {
      this.fetchMonitors(userid);
    });
  }
}
