// Bundle entry: the stylesheet first (esbuild emits it as one CSS file, which
// build.mjs inlines), then the app.
import "./styles.css";
import "./app.jsx";
