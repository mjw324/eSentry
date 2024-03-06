import { SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';
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

  constructor(
    private socialAuthService: SocialAuthService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.socialAuthService.authState.subscribe((user) => {
      if (user != null) {
        this.userService.setCurrentUser(user).subscribe({
          next: (response) => {
            console.log('User is registered/logged in', response);
            this.router.navigate(['/home']);
          }
        });
      }
    });
  }
}
