
export interface Member {
    id: string;       // Firestore Dokument-ID
    name: string;
    image: string;
    email?: string;   // Optional, falls benötigt
    // Weitere Eigenschaften nach Bedarf hinzufügen
  }