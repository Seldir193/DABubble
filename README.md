# DABubble

DABubble ist eine **Angular**-basierte Chat-Anwendung (TypeScript + SCSS), die **Firebase (Firestore & Auth)** im Backend nutzt. Sie ermöglicht Echtzeit-Kommunikation in Kanälen (Channels), Threads und privaten Nachrichten (Direktnachrichten). Außerdem können Benutzer ihr Profil (Avatar, Name, E-Mail-Adresse) bearbeiten.  

## Table of Contents

1. [Overview](#overview)  
2. [Features](#features)  
3. [Technologies](#technologies)  
4. [Installation](#installation)  
5. [Usage](#usage)  
6. [Tests](#tests)  
7. [Screenshots (Optional)](#screenshots-optional)  
8. [Project Structure](#project-structure)  
9. [Angular CLI Info](#angular-cli-info)  
10. [Contributing](#contributing)  
11. [License](#license)

---

## Overview

Die DABubble-App wurde entwickelt, um ein **intuitives und responsives** Chat-Erlebnis zu bieten. Nutzer können in **Kanälen** oder **Thread-Channels** schreiben und andere Mitglieder einladen. Zudem stehen **private Nachrichten** (1:1-Chats) und **Threads** für fokussierte Unterhaltungen zur Verfügung.

Zusätzlich gibt es einen **Gastzugang**, falls sich ein Anwender nicht registrieren möchte. Mit Profilanpassungen (Avatar, Anzeigename, E-Mail) können User ihre Identität personalisieren.

---

## Features

- **Channel & Threads**  
  - Kanäle (Channels) mit mehreren Teilnehmern, Echtzeit-Updates  
  - Threads oder Thread-Channels, um Nachrichten thematisch zu vertiefen  

- **Private Nachrichten (DM)**  
  - 1:1-Kommunikation  
  - Unterstützung von Threads auch in privaten Chats  

- **Profilverwaltung**  
  - Avatar/Profilbild, Name, E-Mail ändern  
  - Online-/Offline-Status (Echtzeit)  

- **Nachrichtenbearbeitung**  
  - Nachricht bearbeiten, löschen, Emojis einfügen, Bilder hochladen  

- **Authentifizierung**  
  - E-Mail/Passwort-Registrierung oder Gast-Login  
  - Passwort-Zurücksetzen  
  - Impressum und Datenschutzbelehrung  

- **Responsive Design**  
  - Desktop- und Mobilgeräte-Unterstützung  
  - Keine separate Mobile-App benötigt  

---

## Technologies

- **Angular** (TypeScript + SCSS)  
- **Firebase**  
  - Firestore (Echtzeit-Datenbank)  
  - Firebase Auth (Registrierung & Login)  
  - Optional: Firebase Storage (Bilder)  
- **Angular CLI** (z. B. Version 17.x)  

*(Passe die Versionsnummern an deine tatsächliche Umgebung an.)*

---

## Installation

### Voraussetzungen

- **Node.js** (Version 16 oder höher)  
- **NPM** oder **Yarn**  
- **Angular CLI** (optional)  
- **Firebase-Konto** (für Firestore/Auth)

### Schritte

1. **Repository klonen**  
   ```bash
   git clone https://github.com/Seldir193/DABubble.git
   cd dabubble
   npm install

## Screenshots (Optional)

Hier einige Beispiel-Screenshots der Anwendung:

<details>
<summary>1. Channel Overview</summary>
<img src="screenshots/channel-overview.png" alt="Channel Overview" style="max-width:100%;">
<p>In diesem Screenshot sieht man die Übersicht der Kanäle, in denen mehrere Mitglieder in Echtzeit chatten können.</p>
</details>

<details>
<summary>2. Thread Feature</summary>
<img src="screenshots/thread-feature.png" alt="Thread Feature" style="max-width:100%;">
<p>Dieses Beispiel zeigt, wie man in einem Channel-Thread eine Unterdiskussion führt – nützlich, um Themen vom Hauptchat zu trennen.</p>
</details>

<details>
<summary>3. Private Nachrichten</summary>
<img src="screenshots/direct-messages.png" alt="Direct Messages" style="max-width:100%;">
<p>Hier die Direktnachrichten (1:1), in denen Emojis, Bilder und Threads ebenfalls genutzt werden können.</p>
</details>


## Usage

1. **Starten der Anwendung**  
   - Führe <code>ng serve</code> aus oder starte in der IDE (z. B. Visual Studio Code) mit dem Angular-CLI-Befehl.
   - Öffne [http://localhost:4200](http://localhost:4200) im Browser.  
   - Bei Änderungen an den Quelldateien wird die Anwendung automatisch neu kompiliert und neu geladen.

2. **Registrierung oder Gast-Login**  
   - Beim ersten Start kannst du einen Account anlegen (E-Mail/Passwort) oder dich als Gast einloggen.
   - Gastnutzer haben eingeschränkte Profilfunktionen.

3. **Channels & Threads**  
   - Erstelle über das „+“-Icon einen neuen Kanal, lade Mitglieder ein und beginne zu chatten.
   - Klicke auf eine Nachricht, um einen Thread zu starten oder Bilder/Emojis hinzuzufügen.

4. **Private Messages**  
   - Wähle einen Nutzer aus, um eine Direktnachricht zu starten. Auch hier kannst du Threads nutzen, um Unterhaltungen zu vertiefen.

5. **Profil bearbeiten**  
   - Klicke auf dein Avatar-Icon (oben rechts), um Name, E-Mail oder Avatar zu ändern und deinen Online-Status zu verwalten.

6. **Datenschutz & Impressum**  
   - Über den Footer-Link oder das Menü zugänglich. Enthält rechtliche Hinweise und Kontaktinformationen.

7. **Passwort zurücksetzen**  
   - Über „Passwort vergessen?“ kannst du ein neues Passwort anfordern (E-Mail-Verifizierung nötig).

## License

Dieses Projekt steht unter der **MIT License**. Details findest du in der [LICENSE](./LICENSE)-Datei.  
*(Falls du eine andere Lizenz verwendest oder die Anwendung privat bleiben soll, passe diesen Abschnitt entsprechend an.)*

