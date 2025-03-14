import { Injectable } from '@angular/core';
import { Firestore, updateDoc, doc, getDoc, collection, getDocs,query,where,onSnapshot  } from '@angular/fire/firestore';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, User, onAuthStateChanged, sendEmailVerification,updateEmail } from 'firebase/auth';
import { Storage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class UserService {constructor(private firestore: Firestore, private storage: Storage) {};

async getCurrentUserData(): Promise<any> {
  const auth = getAuth();

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user && user.uid) {
        try {
          const userDocRef = doc(this.firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          // Setze den Online-Status, wenn der Benutzer angemeldet ist
          await updateDoc(userDocRef, { isOnline: true });

          if (userDocSnap.exists()) {
            resolve({ ...userDocSnap.data(), id: user.uid }); 
            //resolve(userDocSnap.data());
          } else {
            reject(new Error('Benutzer nicht gefunden.'));
          }
        } catch (error) {
          reject(error);
        }
      } else {
        // Wenn kein Benutzer angemeldet ist, setze den Offline-Status
        try {
          const userRef = doc(this.firestore, 'users', user?.uid || '');  // Verwende die letzte bekannte UID, falls verfügbar
          if (userRef) {
            await updateDoc(userRef, { isOnline: false });
          }
        } catch (error) {
          console.error('Fehler beim Setzen des Offline-Status:', error);
        }
        reject(new Error('Kein Benutzer angemeldet.'));
      }
    });
  });
}

  async updateUserEmail(newEmail: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user && user.uid) {
      try {
        // Reauthentifizierung
        await this.reauthenticateUser(user);
  
        // **Update die E-Mail in Firebase Auth**
        await updateEmail(user, newEmail);
  
        // Speichern der neuen E-Mail in localStorage
        localStorage.setItem('newEmail', newEmail);
  
        // **Update die E-Mail in Firestore**
        await this.updateEmailInFirestore(user.uid, newEmail);
  
        // Definiere actionCodeSettings für die Verifizierungs-E-Mail
        const actionCodeSettings = {
          url: 'http://localhost:4200/verify-email',  // Allgemeine Verifizierungsseite
          handleCodeInApp: true
        };
  
        // Verifizierungs-E-Mail an die neue E-Mail-Adresse senden
        await sendEmailVerification(user, actionCodeSettings);
  
        console.log('Verifizierungs-E-Mail wurde gesendet. Bitte bestätigen Sie die neue E-Mail-Adresse.');
      } catch (error: any) {
        console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
        throw error;
      }
    } else {
      throw new Error('Kein Benutzer angemeldet.');
    }
  }
  
  async updateEmailInFirestore(uid: string, newEmail: string): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);
    await updateDoc(userDocRef, { email: newEmail });
    console.log('E-Mail in Firestore erfolgreich aktualisiert.');
  }
  
  private async reauthenticateUser(user: User): Promise<void> {
    const password = prompt('Bitte geben Sie Ihr Passwort ein, um fortzufahren:');
    if (password) {
      const credential = EmailAuthProvider.credential(user.email!, password);
      try {
        await reauthenticateWithCredential(user, credential);
        console.log('Reauthentifizierung erfolgreich.');
      } catch (error) {
        console.error('Reauthentifizierung fehlgeschlagen:', error);
        throw new Error('Reauthentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihr Passwort.');
      }
    } else {
      throw new Error('Passwort erforderlich für die Reauthentifizierung.');
    }
  }
  
  async updateUserAvatar(avatarDataUrl: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user && user.uid) {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        avatarUrl: avatarDataUrl,
      });

      console.log('Avatar erfolgreich aktualisiert.');
    } else {
      throw new Error('Kein Benutzer angemeldet.');
    }
  }

  async updateUserName(newName: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user && user.uid) {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: newName,
      });

      console.log('Benutzername erfolgreich aktualisiert.');
    } else {
      throw new Error('Kein Benutzer angemeldet.');
    }
  }


  async getAllUsers(): Promise<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    const querySnapshot = await getDocs(usersCollection);
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  }



  

  async getUsersByFirstLetter(firstLetter: string): Promise<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    
    // Firestore-Abfrage, um nur Benutzer zu laden, deren Name mit dem angegebenen Buchstaben beginnt
    const q = query(usersCollection, where('name', '>=', firstLetter), where('name', '<=', firstLetter + '\uf8ff'));
    
    const querySnapshot = await getDocs(q);
    const users: any[] = [];
  
    querySnapshot.forEach((doc) => {
      users.push(doc.data());
    });
  
    return users;  
  }

  getCurrentUserId(): string | null {
    const auth = getAuth();
    const user = auth.currentUser;
    return user ? user.uid : null;
  }

  async getUserById(userId: string): Promise<any> {
    const userDocRef = doc(this.firestore, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data();
      

    } else {
      throw new Error('Benutzer nicht gefunden.');
    }
  }

 

  getAllUsersRealTime(callback: (users: any[]) => void): void {
    const usersCollection = collection(this.firestore, 'users');
    onSnapshot(usersCollection, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(users); // Rückgabe der Echtzeitdaten
    });
  }






  getAllUsersLive(callback: (users: any[]) => void): () => void {
    const usersCollection = collection(this.firestore, 'users');
  
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(users); // Aktualisierte Benutzerliste übergeben
    });
  
    return unsubscribe; // Zum Abbestellen des Listeners
  }
  


}









