


import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth,updateEmail, verifyPasswordResetCode,applyActionCode } from '@angular/fire/auth';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [CommonModule,FormsModule,HeaderComponent,FooterComponent],
  templateUrl: './auth-action.component.html',
  styleUrls: ['./auth-action.component.scss']
})
export class AuthActionComponent implements OnInit {
  mode: string | null = null;
  oobCode: string | null = null;
  loading: boolean = true;

  constructor(private route: ActivatedRoute, private auth: Auth, private router: Router,private userService: UserService) {}

  ngOnInit(): void {
    // Lese den `mode` und `oobCode` aus der URL
    this.route.queryParams.subscribe(params => {
      this.mode = params['mode'];
      this.oobCode = params['oobCode'];

      if (this.mode === 'resetPassword') {
        this.handlePasswordReset(this.oobCode);
      }else if (this.mode === 'verifyEmail') {
        this.handleEmailVerification(this.oobCode);
      }
    });
  }

  async handlePasswordReset(oobCode: string | null): Promise<void> {
    if (oobCode) {
      try {
        // Überprüfe den Passwort-Zurücksetzungs-Code
        await verifyPasswordResetCode(this.auth, oobCode);
        // Leite den Benutzer zur `new-passwort`-Seite weiter
        this.router.navigate(['/new-passwort'], { queryParams: { oobCode } });
      } catch (error) {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
      }
    }
  }

  async handleEmailVerification(oobCode: string | null): Promise<void> {
    if (oobCode) {
      try {
        // Wende den Verifizierungs-Code an
        await applyActionCode(this.auth, oobCode);
        
        // Hole die neue E-Mail aus localStorage, die zuvor gespeichert wurde
        const newEmail = localStorage.getItem('newEmail');
        const user = this.auth.currentUser;
  
        if (user && newEmail) {
          // Aktualisiere die E-Mail im Auth-System
          await updateEmail(user, newEmail);
          console.log('E-Mail-Adresse im Auth-System erfolgreich aktualisiert.');
  
          // Aktualisiere die E-Mail auch in Firestore
          await this.userService.updateEmailInFirestore(user.uid, newEmail);
          console.log('E-Mail-Adresse in Firestore erfolgreich aktualisiert.');
  
          // Lösche die gespeicherte E-Mail aus localStorage
          localStorage.removeItem('newEmail');
        }
  
        //this.router.navigate(['/verify-email']);
        this.loading = false;
        this.router.navigate(['/chat']);
      } catch (error) {
        console.error('Fehler bei der E-Mail-Verifizierung:', error);
      }
    }
  }
  
}


