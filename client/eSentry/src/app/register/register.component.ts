import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  repeatPassword: string = '';

  constructor(private router: Router, private userService: UserService, private messageService: MessageService) {}

  onRegister() {
    if (this.password !== this.repeatPassword) {
      this.messageService.add({ severity: "error", summary: "Error", detail: 'Passwords must match' });
      return;
    }
    if (this.password == this.username) {
      this.messageService.add({ severity: "error", summary: "Error", detail: 'Username and password cannot be the same' });
      return;
    }
    // Use the UserService to send the registration request
    this.userService.register(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.router.navigate(['/signin']);
      },
      error: (error) => {
        console.error('Registration failed:', error);
        this.messageService.add({ severity: "error", summary: "Error", detail: 'Registration failed' });
      }
    });
  }
}