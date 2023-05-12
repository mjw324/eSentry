import { GoogleLoginProvider, SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';
import { Component, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import { OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

@NgModule({ imports: [SocialLoginModule] }) export class AuthModule { }


@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {

  constructor(public router: Router,
    public socialAuthService: SocialAuthService,
    public userService:UserService) { }

  ngOnInit() {
    this.socialAuthService.authState.subscribe((user) => {
      if (user != null) {
        console.log(user)
        this.userService.setCurrentUser(user);
        this.router.navigate(['/home']);
      }
    })
  }
}
