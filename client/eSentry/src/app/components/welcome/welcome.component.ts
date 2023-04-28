import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  exampleVariable = 0;

  constructor(public router: Router) { }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
