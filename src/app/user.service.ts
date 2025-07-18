import { Injectable } from '@angular/core';
import {
  Firestore,
  updateDoc,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from '@angular/fire/firestore';
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User,
  onAuthStateChanged,
  sendEmailVerification,
  updateEmail,
  signOut,
} from 'firebase/auth';
import { Storage } from '@angular/fire/storage';
import { Router } from '@angular/router';
import { AppStateService } from './app-state.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private router: Router,
    private appStateService: AppStateService
  ) {}

  async getCurrentUserData(): Promise<any> {
    const auth = getAuth();
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user && user.uid) {
          await this.handleSignedInUser(user, resolve, reject);
        } else {
          await this.handleNoUserSignedIn(user, reject);
        }
      });
    });
  }

  private async handleSignedInUser(
    user: User,
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  ): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        return reject(new Error('User not found.'));
      }
      await updateDoc(userDocRef, { isOnline: true });
      resolve({ ...userDocSnap.data(), id: user.uid });
    } catch (error) {
      reject(error);
    }
  }

  private async handleNoUserSignedIn(
    user: User | null,
    reject: (reason?: any) => void
  ): Promise<void> {
    try {
      if (user?.uid) {
        const userRef = doc(this.firestore, 'users', user.uid);
        await updateDoc(userRef, { isOnline: false });
      }
    } catch (error) {}
    reject(new Error('No user signed in.'));
  }

  async updateUserEmail(newEmail: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !user.uid) throw new Error('No user signed in.');

    try {
      await this.reauthenticateUser(user);
      await this.performEmailUpdate(user, newEmail);
      localStorage.setItem('newEmail', newEmail);
      await this.updateEmailInFirestore(user.uid, newEmail);
      await this.sendVerificationEmail(user);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  private async performEmailUpdate(
    user: User,
    newEmail: string
  ): Promise<void> {
    await updateEmail(user, newEmail);
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const actionCodeSettings = {
      url: 'http://localhost:4200/verify-email',
      handleCodeInApp: true,
    };
    await sendEmailVerification(user, actionCodeSettings);
  }

  async updateEmailInFirestore(uid: string, newEmail: string): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);
    await updateDoc(userDocRef, { email: newEmail });
  }

  private async reauthenticateUser(user: User): Promise<void> {
    const password = prompt(
      'Bitte geben Sie Ihr Passwort ein, um fortzufahren:'
    );
    if (password) {
      const credential = EmailAuthProvider.credential(user.email!, password);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (error) {
        throw new Error(
          'Reauthentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihr Passwort.'
        );
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

    const q = query(
      usersCollection,
      where('name', '>=', firstLetter),
      where('name', '<=', firstLetter + '\uf8ff')
    );

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
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(users);
    });
  }

  getAllUsersLive(callback: (users: any[]) => void): () => void {
    const usersCollection = collection(this.firestore, 'users');

    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(users);
    });
    return unsubscribe;
  }

  async logout(): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      await this.handleLogout(user);
      this.appStateService.setShowWelcomeContainer(true);
      this.router.navigate(['/login']);
    } catch {}
  }

  private async handleLogout(user: User): Promise<void> {
    const auth = getAuth();
    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await signOut(auth);
      return;
    }

    const userData = userDocSnap.data() as any;
    if (userData.name && userData.name.startsWith('Guest')) {
      await deleteDoc(userDocRef);
    } else {
      await updateDoc(userDocRef, { isOnline: false });
    }

    await signOut(auth);
  }
}
