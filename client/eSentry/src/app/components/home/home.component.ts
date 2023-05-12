import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  user = this.userService.getCurrentUser();

  constructor(public router: Router,
    public socialAuthService: SocialAuthService,
    public userService: UserService) { }

  logout() {
    this.socialAuthService.signOut().then(() => this.router.navigate(['']));
  }
}
