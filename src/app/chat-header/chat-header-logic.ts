import { ChatHeaderComponent } from './chat-header.component';

export async function onFileSelectedLogic(
  component: ChatHeaderComponent,
  event: Event
): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files ? input.files[0] : null;

  if (!file) {
    component.errorMessage = 'Keine Datei ausgewählt.';
    return;
  }
  if (!file.type.startsWith('image/')) {
    component.errorMessage = 'Bitte wählen Sie eine Bilddatei aus.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    component.errorMessage = 'Die Datei ist zu groß. Bitte < 5 MB auswählen.';
    return;
  }
  component.errorMessage = '';
  readAndUploadFileLogic(component, file);
}

function readAndUploadFileLogic(
  component: ChatHeaderComponent,
  file: File
): void {
  const reader = new FileReader();
  reader.onload = async () => {
    const imageDataUrl = reader.result as string;
    try {
      await component.userService.updateUserAvatar(imageDataUrl);
      component.userAvatarUrl = imageDataUrl;
      component.successMessage = 'Profilbild erfolgreich aktualisiert!';
      setTimeout(() => (component.successMessage = ''), 3000);
    } catch (err: any) {
      component.errorMessage =
        err.message || 'Fehler beim Aktualisieren des Profilbildes.';
    }
  };
  reader.readAsDataURL(file);
}

