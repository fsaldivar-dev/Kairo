fn main() {
    tauri_plugin::Builder::new(&["save_document", "load_document", "list_documents", "delete_document"]).build();
}
