import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService:SocialAuthService, private router:Router) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> {
      console.log('guard');
      return this.authService.authState.pipe(
        take(1), // <--- add this line
        map((socialUser: SocialUser) => {
          console.log('map');
          if(socialUser == null){
            this.router.navigate(['/'])
          }
          return !!socialUser;
        }),
        catchError((error) => {
          console.log(error);
          return of(false);
        })
      );
  }
  
}
