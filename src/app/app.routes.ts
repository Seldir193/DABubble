import { Routes} from '@angular/router';
import { IntroComponent } from './intro/intro.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ImprintComponent } from './imprint/imprint.component';
import { AvatarComponent } from './avatar/avatar.component';
import { ChatComponent } from './chat/chat.component';
import { PasswortResetComponent } from './passwort-reset/passwort-reset.component';
import { NewPasswortComponent } from './new-passwort/new-passwort.component';

export const routes: Routes = [
    { path: '', redirectTo: '/intro', pathMatch: 'full' },
    { path: 'intro', component: IntroComponent },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'privacy', component: PrivacyComponent },
    { path: 'imprint', component: ImprintComponent },
    { path: 'avatar', component: AvatarComponent },
    { path: 'chat', component: ChatComponent},
    { path: 'passwort-reset', component: PasswortResetComponent},
    { path: 'new-passwort', component: NewPasswortComponent}
];


  