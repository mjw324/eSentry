import { Injectable } from '@angular/core';
import { DEFAULT_USER, User } from '../models/user.model';
import { SocialUser } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  currentUser: User = DEFAULT_USER;
  constructor() { }

  setCurrentUser(socialUser: SocialUser) {
    this.currentUser = {
      photoUrl: socialUser.photoUrl,
      name: socialUser.name,
      email: socialUser.email
    }
  }
  getCurrentUser(): User {
    return this.currentUser;
  }
}
