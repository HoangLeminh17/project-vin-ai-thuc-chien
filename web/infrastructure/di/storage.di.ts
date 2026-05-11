import { FirebaseStorageAdapter } from '../adapters/firebase-storage.adapter';
import { getBucket } from '@/lib/firebase-admin';

// Here we isolate the global getBucket() call to the DI layer.
// The Adapter remains clean and testable.
export const storageAdapter = new FirebaseStorageAdapter(getBucket());
export const storageService = storageAdapter;
