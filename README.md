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

Die DABubble-App wurde entwickelt, um ein **intuitives und responsives** Chat-Erlebnis zu bieten. Nutzer können in **Kanälen** oder **Thread-Channels** schreiben und andere Mitglieder einladen. Zudem stehen **private Nachrichten** (1:1-Chats) und **Thread** für fokussierte Unterhaltungen zur Verfügung.

Zusätzlich gibt es einen **Gastzugang**, falls sich ein Anwender nicht registrieren möchte. Mit Profilanpassungen (Avatar, Anzeigename, E-Mail) können User ihre Identität personalisieren.

---

## Features

- **Channel & Threads**  
  - Kanäle (Channels) mit mehreren Teilnehmern, Echtzeit-Updates  
  - Thread-Channels-Funktion, um Nachrichten thematisch zu vertiefen  

- **Private Nachrichten (DM)**  
  - 1:1-Kommunikation  
  - Unterstützung von **Thread** auch in privaten Chats  

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

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.


### Schritte

1. **Repository klonen**  
   ```bash
   git clone https://github.com/Seldir193/DABubble.git
   cd dabubble
   npm install
