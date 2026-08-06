fn main() {
    let mut builder = tauri_build::Builder::default();
    builder
        .plugin("custom-plugin", |
    )
        .setup(tauri::BundleType::Rust, |&cfg| {
            // set app name
            cfg.product_name = "DemoApp";
        })
        .compile();
}
