// Bundle entry: the stylesheets first (esbuild emits them as one CSS file,
// which build.mjs inlines), then the store.
import "./styles.css";
import "./store.css";
import "./app.jsx";
