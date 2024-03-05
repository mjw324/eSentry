import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DEFAULT_USER, User } from '../models/user.model';
import { SocialUser } from '@abacritt/angularx-social-login';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class UserService {

  currentUser: User = DEFAULT_USER;
  constructor(private http: HttpClient) { }

  setCurrentUser(socialUser: SocialUser) {
    const user: User = {
      photoUrl: socialUser.photoUrl,
      name: socialUser.name,
      email: socialUser.email,
      id: socialUser.id
    };
    this.currentUser = user;
    // Send the user data to the backend
    return this.http.post(`${environment.url}/register-or-login`, user);
  }
  getCurrentUser(): User {
    return this.currentUser;
  }
  getCurrentUserID(): string {
    return this.currentUser.id;
  }

  isLoggedIn(): boolean {
    return this.currentUser && this.currentUser.id !== DEFAULT_USER.id;
  }
  
  
  register(username: string, password: string): Observable<any> {
    return this.http.post(`${environment.url}/register`, { username, password });
  }
  signIn(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.url}/login`, { username, password }).pipe(
      tap(response => {
        // Set currentUser with response data
        const user: User = {
          id: response.userid,
          name: '',
          email: '',
          photoUrl: 'https://icon-library.com/images/default-user-icon/default-user-icon-13.jpg',
          username: username
        };
        this.currentUser = user;
      })
    );
  }
}
