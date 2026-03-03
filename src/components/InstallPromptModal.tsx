import {
  Download,
  Monitor,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
} from "lucide-react";

import type { ReactNode } from "react";

import type { InstallPromptVariant } from "../pwa/installPrompt";

type Props = {
  variant: InstallPromptVariant;
  onContinue: () => void;
};

export default function InstallPromptModal({ variant, onContinue }: Props) {
  const title = "Install the app";
  const subtitle =
    "Add this site to your home screen to use it like a real app.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4">
          {variant === "ios-safari" && (
            <>
              <Step
                icon={<Share size={18} />}
                title="1) Tap “Share”"
                description="In Safari, at the bottom of the screen (share icon)."
              />
              <Step
                icon={<PlusSquare size={18} />}
                title="2) “Add to Home Screen”"
                description="Scroll the action list if needed."
              />
              <Step
                icon={<Smartphone size={18} />}
                title="3) Open it from your home screen"
                description="Sign-in and the panel will work as usual."
                accent="emerald"
              />
            </>
          )}

          {variant === "android-chrome" && (
            <>
              <Step
                icon={<MoreVertical size={18} />}
                title="1) Open the menu (⋮)"
                description="At the top-right of your browser."
              />
              <Step
                icon={<Download size={18} />}
                title="2) “Install app”"
                description="Or “Add to Home screen”, depending on the browser."
              />
              <Step
                icon={<Smartphone size={18} />}
                title="3) Launch it from your home screen"
                description="You’ll open the site in app mode."
                accent="emerald"
              />
            </>
          )}

          {variant === "desktop-chrome" && (
            <>
              <Step
                icon={<Monitor size={18} />}
                title="1) Click the install icon"
                description="In the address bar (or via the browser menu)."
              />
              <Step
                icon={<Download size={18} />}
                title="2) Confirm “Install”"
                description="A window will open to install the app."
              />
              <Step
                icon={<Monitor size={18} />}
                title="3) Open the installed app"
                description="It will appear in your apps like a normal application."
                accent="emerald"
              />
            </>
          )}

          {variant === "other" && (
            <>
              <Step
                icon={<Smartphone size={18} />}
                title="1) Open the browser menu"
                description="Look for an install option or ‘add to home screen’."
              />
              <Step
                icon={<PlusSquare size={18} />}
                title="2) “Add to Home Screen”"
                description="Or “Install app” if available."
              />
              <Step
                icon={<Download size={18} />}
                title="3) Open it from your home screen"
                description="You’ll get a smoother experience."
                accent="emerald"
              />
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90"
          >
            Continue to the site
          </button>
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: "sky" | "emerald";
};

function Step({ icon, title, description, accent = "sky" }: StepProps) {
  const accentClasses =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-sky-500/15 text-sky-300";

  return (
    <div className="flex gap-3">
      <div
        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${accentClasses}`}
      >
        {icon}
      </div>
      <div className="text-sm">
        <div className="font-medium text-white">{title}</div>
        <div className="text-slate-300">{description}</div>
      </div>
    </div>
  );
}
