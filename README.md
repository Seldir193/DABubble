# DABubble

DABubble is an **Angular**-based chat application (TypeScript + SCSS) that uses **Firebase (Firestore & Auth)** as its backend. It enables real-time communication in channels (Channels), threads, and private messages (direct messages). Additionally, users can customize their profile (avatar, name, email address).

## Table of Contents

1. [Overview](#overview)  
2. [Features](#features)  
3. [Technologies](#technologies)  
4. [Installation](#installation)  
5. [Usage](#usage)  
6. [Tests](#tests)  
7. [Screenshots (Optional)](#screenshots-optional)  
8. [Project Structure](#project-structure)  
9. [Contributing](#contributing)  
10. [License](#license)

---

## Overview

The DABubble app was created to provide an **intuitive and responsive** chat experience. Users can write messages in **channels** or **thread-channels** and invite other members. Additionally, there are **private messages** (1:1 chats) and **threads** for in-depth conversations.

There is also a **guest mode** for those who prefer not to register. Users can personalize their profiles by adjusting their avatar, display name, and email address.

---

## Features

- **Channels & Threads**  
  - Channels with multiple participants and real-time updates  
  - Threads or thread-channels for structured, topic-specific discussions  

- **Private Messages (DM)**  
  - 1:1 communication  
  - Thread support in private chats  

- **Profile Management**  
  - Edit avatar/profile picture, name, and email  
  - Online/offline status in real time  

- **Message Editing**  
  - Edit or delete messages, add emojis, upload images  

- **Authentication**  
  - Email/password registration or guest login  
  - Password reset  
  - Legal notice (Impressum) and privacy policy  

- **Responsive Design**  
  - Desktop and mobile support  
  - No separate mobile app required  

---

## Technologies

- **Angular** (TypeScript + SCSS)  
- **Firebase**  
  - Firestore (real-time database)  
  - Firebase Auth (registration & login)  
  - Optional: Firebase Storage (images)  
- **Angular CLI** (e.g., version 17.x)  

*(Adjust the version number to match your actual environment.)*

---

## Installation

### Prerequisites

- **Node.js** (version 16 or higher)  
- **NPM** or **Yarn**  
- **Angular CLI** (optional)  
- **Firebase account** (for Firestore/Auth)

### Steps

1. **Clone the repository**  
   ```bash
   git clone https://github.com/Seldir193/DABubble.git
   cd dabubble
   npm install

## Screenshots (Optional)

Below are some sample screenshots of the application:

<details>
<summary>1. Channel Overview</summary>
<img src="assets/img/channel.jpg" alt="Channel Overview" style="max-width:100%;">
<p>This screenshot shows an overview of the channels in which multiple members can chat in real time.</p>
</details>

<details>
<summary>2. Thread-Channel Feature</summary>
<img src="assets/img/thread.jpg" alt="Thread Feature" style="max-width:100%;">
<p>This example illustrates how to start a sub-discussion (thread) within a channel—helpful for separating topics from the main chat.</p>
</details>

<details>
<summary>3. Private Messages</summary>
<img src="img/assets/privat.jpg" alt="Direct Messages" style="max-width:100%;">
<p>Here you can see direct (1:1) messages where you can also use emojis, images, and threads.</p>
</details>

<details>
<summary>4. Thread Messages</summary>
<img src="assets/img/privthre.jpg" alt="Direct Messages" style="max-width:100%;">
<p>This example shows how you can hold a sub-discussion (thread) within a channel, separate from the main chat.</p>
</details>

---

## Usage

1. **Starting the Application**  
   - Run <code>ng serve</code> or start it in your IDE (e.g., Visual Studio Code) using an Angular CLI command.  
   - Open [http://localhost:4200](http://localhost:4200) in your browser.  
   - The application automatically recompiles and reloads when you make changes to the source files.

2. **Registration or Guest Login**  
   - On first launch, you can create an account (email/password) or log in as a guest.  
   - Guest users have limited profile features.

3. **Channels & Threads**  
   - Click the “+” icon to create a new channel, invite members, and start chatting.  
   - Click on a message to start a thread or to attach images/emojis.

4. **Private Messages**  
   - Select a user to start a direct (1:1) message. You can also use threads here for more in-depth discussions.

5. **Edit Your Profile**  
   - Click your avatar icon (top right) to change your name, email, or avatar, and to manage your online status.

6. **Privacy Policy & Legal Notice**  
   - Accessible via the footer link or the menu, containing legal notices and contact info.

7. **Password Reset**  
   - Use “Forgot Password?” to request a new password (email verification required).

---

## Tests

### Unit Tests (Jasmine/Karma)

To run the **unit tests** (using Jasmine/Karma), ensure that you have installed all required dependencies. Then execute:

ng test

## Project Structure

DABubble/  
├─ src/  
│  ├─ app/  
│  │  ├─ components/  
│  │  │  ├─ chat-component.html  
│  │  │  ├─ add-members-dialog.html  
│  │  │  ├─ add-members-dialog-mobile.html  
│  │  │  ├─ auth-action.html  
│  │  │  ├─ avatar.html  
│  │  │  ├─ channel-dialog.html  
│  │  │  ├─ chat-header.html  
│  │  │  ├─ devspace.html  
│  │  │  ├─ direct-messages.html  
│  │  │  ├─ edit-channel-dialog.html  
│  │  │  ├─ entwicklerteam.html  
│  │  │  ├─ footer.html  
│  │  │  ├─ header.html  
│  │  │  ├─ imprint.html  
│  │  │  ├─ inner-channel.html  
│  │  │  ├─ intro.html  
│  │  │  ├─ login.html  
│  │  │  ├─ members-list-dialog.html  
│  │  │  ├─ member-section-dialog.html  
│  │  │  ├─ members-dialog.html  
│  │  │  ├─ new-passwort.html  
│  │  │  ├─ passwort-reset.html  
│  │  │  ├─ privacy.html  
│  │  │  ├─ private-messages.html  
│  │  │  ├─ profil-dialog.html  
│  │  │  ├─ search-field.html  
│  │  │  ├─ search-result-dialog.html  
│  │  │  ├─ selected-mebers-dialog.html  
│  │  │  ├─ signup.html  
│  │  │  ├─ thread.html  
│  │  │  ├─ thread-channel.html  
│  │  │  ├─ verify-email.html  
│  │  │  └─ welcome-screen.html  
│  │  │  
│  │  │  /* Note:
│  │  │     Each .html file has a corresponding .ts & .scss,
│  │  │     e.g. \"chat-component.ts\" and \"chat-component.scss\" */
│  │  ├─ services/
│  │  │  ├─ user.service.ts
│  │  │  ├─ message.service.ts
│  │  │  ├─ channel.service.ts
│  │  │  └─ app-state.service.ts
│  │  ├─ pages/
│  │  │  ├─ app.component.html
│  │  │  ├─ app.component.scss
│  │  │  ├─ app.component.spec.ts
│  │  │  └─ app.component.ts
│  │  ├─ app.config.ts
│  │  ├─ app.routes.ts
│  │  ├─ message.model.ts
│  │  └─ member.models.ts
│  ├─ environments/
│  │  ├─ environment.ts
│  │  └─ environment.prod.ts
│  ├─ main.ts
│  ├─ index.html
│  └─ ...
├─ angular.json
├─ package.json
├─ README.md
└─ ...

---

## Contributing

Contributions are welcome! Fork the repository, create a new branch, and submit a pull request.

Please ensure that your code follows these guidelines:
- **Clean Code principles**: Write simple, understandable, and maintainable code.

---

## License

This project is licensed under the **MIT License**. For more details, see the [LICENSE](./LICENSE) file.


