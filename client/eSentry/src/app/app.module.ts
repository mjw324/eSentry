import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SliderModule } from 'primeng/slider';
import { ChipsModule } from 'primeng/chips';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SplitButtonModule } from 'primeng/splitbutton';

import {
  GoogleLoginProvider,
  GoogleSigninButtonModule,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';

import { MonitorListComponent } from './components/monitor-list/monitor-list.component';
import { NewMonitorMenuComponent } from './components/new-monitor-menu/new-monitor-menu.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { HomeComponent } from './components/home/home.component';
import { HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { SigninComponent } from './signin/signin.component';
import { RegisterComponent } from './register/register.component';
import { ErrorHandlerService } from './services/error-handler.service';
import { GlobalErrorHandler } from './services/global-error-handler';
import { EditMonitorMenuComponent } from './components/edit-monitor-menu/edit-monitor-menu/edit-monitor-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    HomeComponent,
    MonitorListComponent,
    NewMonitorMenuComponent,
    SigninComponent,
    RegisterComponent,
    EditMonitorMenuComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ButtonModule,
    GoogleSigninButtonModule,
    SelectButtonModule,
    SliderModule,
    ChipsModule,
    MenubarModule,
    AvatarModule,
    TableModule,
    DialogModule,
    BrowserAnimationsModule,
    HttpClientModule,
    InputTextareaModule,
    InputTextModule,
    ToastModule,
    InputSwitchModule,
    SplitButtonModule,
  ],
  providers: [
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: true, //keeps the user signed in
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              environment.google_client_id,
            ), // eSentry client id
          },
        ],
        onError: (err: any) => {
          console.error(err);
        },
      } as SocialAuthServiceConfig,
    },
    MessageService,
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    ErrorHandlerService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }