import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './signIn.component.html',
  styleUrls: ['./signIn.component.css']
})
export class SigninComponent {
  username: string = '';
  password: string = '';

  constructor(private userService: UserService, private router: Router) {}

  onSignIn() {
    this.userService.signIn(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Sign-in successful:', response);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Sign-in failed:', error);
        alert('Sign-in failed: ' + (error.error.message || 'Unknown error'));
      }
    });
  }
}
