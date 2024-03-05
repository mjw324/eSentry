import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DEFAULT_USER, User } from '../models/user.model';
import { SocialUser } from '@abacritt/angularx-social-login';
import { environment } from 'src/environments/environment';


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

  isLoggedIn():boolean{
    return this.currentUser != DEFAULT_USER
  }
}
