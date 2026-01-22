import { useEffect, useState } from "react";
import InstallPromptModal from "./components/InstallPromptModal";
import {
  getInstallPromptVariant,
  markInstallPromptDismissed,
  shouldShowInstallPrompt,
} from "./pwa/installPrompt";

function App() {
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if (shouldShowInstallPrompt()) {
      setShowInstallHelp(true);
    }
  }, []);

  if (showInstallHelp) {
    return (
      <InstallPromptModal
        variant={getInstallPromptVariant()}
        onContinue={() => {
          markInstallPromptDismissed();
          setShowInstallHelp(false);
        }}
      />
    );
  }

  return (
    <div className="bg-slate-950" style={{ height: "100svh" }}>
      <p
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        Start prompting (or editing) to see magic happen :)
      </p>
      <iframe
        title="Upload chantier"
        src="/upload.html"
        style={{
          border: "none",
          width: "100%",
          height: "100%",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}

export default App;
