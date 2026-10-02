//! Tauri integration is intentionally outside the visual renderer.
//! Only explicit document save/load operations cross IPC; pointer events never do.
use serde_json::Value;
use std::{fs, io::Write, path::{Path, PathBuf}};
use tauri::{plugin::{Builder, TauriPlugin}, AppHandle, Manager, Runtime};

const MAX_BYTES: usize = 8 * 1024 * 1024;

fn document_path(directory: &Path, id: &str) -> Result<PathBuf, String> {
    if id.is_empty() || id.len() > 80 || !id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_') {
        return Err("Document ID must contain 1–80 letters, digits, underscores or hyphens".into());
    }
    Ok(directory.join(format!("{id}.json")))
}

fn validate_envelope(document: &Value) -> Result<(), String> {
    if !matches!(document.get("version").and_then(Value::as_u64), Some(1 | 2))
        || !document.pointer("/graph/nodes").is_some_and(Value::is_array)
        || !document.pointer("/graph/edges").is_some_and(Value::is_array)
        || !document.pointer("/layout/nodes").is_some_and(Value::is_object)
        || !document.pointer("/layout/edges").is_some_and(Value::is_object)
    { return Err("Invalid diagram document envelope".into()); }
    Ok(())
}

fn save_at(directory: &Path, id: &str, document: &Value) -> Result<(), String> {
    let path = document_path(directory, id)?;
    validate_envelope(document)?;
    let bytes = serde_json::to_vec(document).map_err(|e| e.to_string())?;
    if bytes.len() > MAX_BYTES { return Err("Document exceeds 8 MiB".into()); }
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    // Same-directory atomic replacement; interrupted writes preserve the previous file.
    let mut temporary = tempfile::NamedTempFile::new_in(directory).map_err(|e| e.to_string())?;
    temporary.write_all(&bytes).map_err(|e| e.to_string())?;
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    temporary.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_at(directory: &Path, id: &str) -> Result<Option<Value>, String> {
    use std::io::Read;
    let path = document_path(directory, id)?;
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };
    let mut bytes = Vec::new();
    file.take((MAX_BYTES + 1) as u64).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
    if bytes.len() > MAX_BYTES { return Err("Document exceeds 8 MiB".into()); }
    let document: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    validate_envelope(&document)?;
    Ok(Some(document))
}

fn list_at(directory: &Path) -> Result<Vec<String>, String> {
    let entries = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(e.to_string()),
    };
    let mut ids = Vec::new();
    for entry in entries {
        let name = entry.map_err(|e| e.to_string())?.file_name();
        if let Some(stem) = name.to_string_lossy().strip_suffix(".json") {
            if document_path(directory, stem).is_ok() { ids.push(stem.to_string()); }
        }
    }
    ids.sort();
    Ok(ids)
}

fn delete_at(directory: &Path, id: &str) -> Result<bool, String> {
    let path = document_path(directory, id)?;
    match fs::remove_file(path) {
        Ok(()) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn save_document<R: Runtime>(app: AppHandle<R>, id: String, document: Value) -> Result<(), String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("diagrams");
    tauri::async_runtime::spawn_blocking(move || save_at(&directory, &id, &document)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_document<R: Runtime>(app: AppHandle<R>, id: String) -> Result<Option<Value>, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("diagrams");
    tauri::async_runtime::spawn_blocking(move || load_at(&directory, &id)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_documents<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("diagrams");
    tauri::async_runtime::spawn_blocking(move || list_at(&directory)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_document<R: Runtime>(app: AppHandle<R>, id: String) -> Result<bool, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("diagrams");
    tauri::async_runtime::spawn_blocking(move || delete_at(&directory, &id)).await.map_err(|e| e.to_string())?
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("kairo")
        .invoke_handler(tauri::generate_handler![save_document, load_document, list_documents, delete_document])
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn document() -> Value { json!({"version": 1, "graph": {"nodes": [], "edges": []}, "layout": {"nodes": {}, "edges": {}}}) }

    #[test]
    fn refuses_paths_and_empty_ids() {
        for id in ["", "../secrets", "/tmp/file", "a/b", "a\\b", "."] { assert!(document_path(Path::new("/tmp"), id).is_err()); }
        assert!(document_path(Path::new("/tmp"), "architecture-01").is_ok());
    }
    #[test]
    fn round_trip_replaces_existing_document() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(load_at(dir.path(), "example").unwrap(), None);
        save_at(dir.path(), "example", &document()).unwrap();
        let mut changed = document(); changed["graph"]["nodes"] = json!([{"id": "auth"}]);
        save_at(dir.path(), "example", &changed).unwrap();
        assert_eq!(load_at(dir.path(), "example").unwrap(), Some(changed));
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn invalid_write_preserves_previous_document() {
        let dir = tempfile::tempdir().unwrap();
        save_at(dir.path(), "example", &document()).unwrap();
        assert!(save_at(dir.path(), "example", &json!({"version": 2})).is_err());
        let mut big = document(); big["padding"] = Value::String("x".repeat(MAX_BYTES));
        assert!(save_at(dir.path(), "example", &big).is_err());
        assert_eq!(load_at(dir.path(), "example").unwrap(), Some(document()));
    }
    #[test]
    fn round_trip_v2_preserves_metadata_and_rejects_future_version() {
        let dir = tempfile::tempdir().unwrap();
        let mut value = document();
        value["version"] = json!(2);
        value["graph"]["nodes"] = json!([{"id":"decision", "type":"decision", "title":"Ready?", "tags":["review"]}]);
        value["layout"]["nodes"] = json!({"decision":{"x":0,"y":0,"width":240,"height":150,"shape":"diamond"}});
        save_at(dir.path(), "v2", &value).unwrap();
        assert_eq!(load_at(dir.path(), "v2").unwrap(), Some(value.clone()));
        value["version"] = json!(3);
        assert!(save_at(dir.path(), "v2", &value).is_err());
        assert_eq!(load_at(dir.path(), "v2").unwrap().unwrap()["version"], json!(2));
    }
    #[test]
    fn corrupt_file_reports_error() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("example.json"), b"{broken").unwrap();
        assert!(load_at(dir.path(), "example").is_err());
    }
    #[test]
    fn lists_saved_document_ids_sorted_ignoring_other_files() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(list_at(dir.path()).unwrap(), Vec::<String>::new());
        save_at(dir.path(), "zeta", &document()).unwrap();
        save_at(dir.path(), "alpha", &document()).unwrap();
        fs::write(dir.path().join("notes.txt"), b"x").unwrap();
        assert_eq!(list_at(dir.path()).unwrap(), vec!["alpha".to_string(), "zeta".to_string()]);
    }
    #[test]
    fn deletes_document_and_reports_absence() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(delete_at(dir.path(), "missing").unwrap(), false);
        save_at(dir.path(), "temp", &document()).unwrap();
        assert_eq!(delete_at(dir.path(), "temp").unwrap(), true);
        assert_eq!(load_at(dir.path(), "temp").unwrap(), None);
        assert!(delete_at(dir.path(), "../escape").is_err());
    }
}
