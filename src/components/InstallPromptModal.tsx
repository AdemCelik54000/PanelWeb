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
  const title = "Installer l’application";
  const subtitle =
    "Ajoutez ce site à votre écran d’accueil pour l’utiliser comme une vraie application.";

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
                title="1) Appuyez sur “Partager”"
                description="Dans Safari, en bas de l’écran (icône de partage)."
              />
              <Step
                icon={<PlusSquare size={18} />}
                title="2) “Ajouter à l’écran d’accueil”"
                description="Faites défiler la liste d’actions si besoin."
              />
              <Step
                icon={<Smartphone size={18} />}
                title="3) Ouvrez ensuite depuis l’écran d’accueil"
                description="La connexion et le panel fonctionneront comme d’habitude."
                accent="emerald"
              />
            </>
          )}

          {variant === "android-chrome" && (
            <>
              <Step
                icon={<MoreVertical size={18} />}
                title="1) Ouvrez le menu (⋮)"
                description="En haut à droite de votre navigateur."
              />
              <Step
                icon={<Download size={18} />}
                title="2) “Installer l’application”"
                description="Ou “Ajouter à l’écran d’accueil” selon le navigateur."
              />
              <Step
                icon={<Smartphone size={18} />}
                title="3) Lancez l’app depuis l’écran d’accueil"
                description="Vous accédez au site en mode application."
                accent="emerald"
              />
            </>
          )}

          {variant === "desktop-chrome" && (
            <>
              <Step
                icon={<Monitor size={18} />}
                title="1) Cliquez sur l’icône d’installation"
                description="Dans la barre d’adresse (ou via le menu du navigateur)."
              />
              <Step
                icon={<Download size={18} />}
                title="2) Confirmez “Installer”"
                description="Une fenêtre s’ouvre pour installer l’application."
              />
              <Step
                icon={<Monitor size={18} />}
                title="3) Ouvrez l’app installée"
                description="Elle apparaît dans vos applications comme une app classique."
                accent="emerald"
              />
            </>
          )}

          {variant === "other" && (
            <>
              <Step
                icon={<Smartphone size={18} />}
                title="1) Ouvrez le menu du navigateur"
                description="Cherchez une option d’installation ou d’ajout à l’accueil."
              />
              <Step
                icon={<PlusSquare size={18} />}
                title="2) “Ajouter à l’écran d’accueil”"
                description="Ou “Installer l’application” si disponible."
              />
              <Step
                icon={<Download size={18} />}
                title="3) Ouvrez ensuite depuis votre accueil"
                description="Vous aurez une expérience plus fluide."
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
            Continuer sur le site
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
