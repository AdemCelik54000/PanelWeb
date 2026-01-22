import { useEffect, useState } from "react";
import IosInstallPromptModal from "./components/IosInstallPromptModal";
import {
  markIosA2hsPromptDismissed,
  markIosA2hsPromptSeenThisSession,
  shouldShowIosA2hsPrompt,
} from "./pwa/iosInstallPrompt";

function App() {
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if (shouldShowIosA2hsPrompt()) {
      setShowInstallHelp(true);
      markIosA2hsPromptSeenThisSession();
    }
  }, []);

  if (showInstallHelp) {
    return (
      <IosInstallPromptModal
        onContinue={() => {
          markIosA2hsPromptDismissed();
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
