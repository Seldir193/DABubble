import { Routes} from '@angular/router';
import { IntroComponent } from './intro/intro.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { ImprintComponent } from './imprint/imprint.component';
import { AvatarComponent } from './avatar/avatar.component';

export const routes: Routes = [
    { path: '', redirectTo: '/intro', pathMatch: 'full' },
    { path: 'intro', component: IntroComponent },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'privacy', component: PrivacyComponent },
    { path: 'imprint', component: ImprintComponent },
    { path: 'avatar', component: AvatarComponent },
];


  