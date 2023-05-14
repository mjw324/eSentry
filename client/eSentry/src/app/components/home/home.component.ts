import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_USER } from 'src/app/models/user.model';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  user = DEFAULT_USER;
  showDialog = false;

  items = [
    {
      label:'New Monitor',
      icon:'pi pi-plus',
      command: () => this.showDialog = true
    },
    {
      label:'Logout',
      icon:'pi pi-power-off',
      command: () => this.logout()
    }
  ]

  constructor(public router: Router,
    public socialAuthService: SocialAuthService,
    public userService: UserService) { }

  ngOnInit(): void {
    const currentUser = this.userService.getCurrentUser()
    if (currentUser!=DEFAULT_USER) {
      this.user = currentUser;
    }
    else {
      this.router.navigate(['']);
    }
  }

  logout() {
    this.socialAuthService.signOut().then(() => this.router.navigate(['']));
  }
}
