import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Monitor } from '../models/monitor.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MonitorRequest } from '../models/monitor-request.model';
import { environment } from 'src/environments/environment';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  monitors: Subject<Monitor[]> = new Subject<Monitor[]>();

  constructor(public http: HttpClient, public messageService: MessageService) {}

  getMonitors(): Observable<Monitor[]> {
    return this.monitors.asObservable();
  }

  async fetchMonitors(userid: string) {
      const data = await fetch(environment.url + '/monitors',{
        method:"GET",
        headers:{
          'userid':userid
        }
      }).catch((error)=>{
        this.messageService.add({severity:"error",summary:"Error",detail:error.message})
        this.monitors.next([])
        return
      })
      data?.json().then((monitors)=>{
        this.monitors.next(monitors)
      })
  }

  addMonitor(request: MonitorRequest, userid: string) {
    this.http
      .post<Monitor>(environment.url + '/monitors', request)
      .subscribe((monitor) => {
        this.fetchMonitors(userid);
      });
  }
  
  deleteMonitor(monitorid: number, userid: string) {
    return this.http.delete(environment.url + '/monitors/' + monitorid, { headers: { userid: userid }});
  }
}
