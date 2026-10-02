import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseDocument, type DiagramDocument } from '@fsaldivar.dev/diagram';

export { isTauri };
/** IDs are local document names, not arbitrary filesystem paths. */
export async function saveDocument(id: string, document: DiagramDocument): Promise<void> {
  await invoke('plugin:kairo|save_document', { id, document: parseDocument(document) });
}
export async function loadDocument(id: string): Promise<DiagramDocument | null> {
  const value = await invoke<unknown>('plugin:kairo|load_document', { id });
  return value === null ? null : parseDocument(value);
}
/** Lists the ids of saved diagrams (filenames without extension), sorted. */
export async function listDocuments(): Promise<string[]> {
  return invoke<string[]>('plugin:kairo|list_documents');
}
/** Deletes a saved diagram by id. Resolves true if a file was removed, false if it did not exist. */
export async function deleteDocument(id: string): Promise<boolean> {
  return invoke<boolean>('plugin:kairo|delete_document', { id });
}
