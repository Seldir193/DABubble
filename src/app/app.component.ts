import { Component, inject, } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IntroComponent } from "./intro/intro.component";
import { LoginComponent } from './login/login.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { SignupComponent } from './signup/signup.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ImprintComponent } from './imprint/imprint.component';
import { AvatarComponent } from './avatar/avatar.component';
import { RouterLink } from '@angular/router';


import { Firestore,collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,IntroComponent,AvatarComponent,PrivacyComponent,ImprintComponent,LoginComponent,FooterComponent,CommonModule,FormsModule,HeaderComponent,SignupComponent,RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent  {
  title = 'DABubble';

  items$: Observable<any[]>;
  firestore: Firestore = inject(Firestore);
 
  constructor(){
    const aCollection = collection(this.firestore, 'items')
    this.items$ = collectionData(aCollection);
  }
 
}
