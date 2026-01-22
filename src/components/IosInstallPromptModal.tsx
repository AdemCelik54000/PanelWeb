import { PlusSquare, Share } from "lucide-react";

type Props = {
  onContinue: () => void;
};

export default function IosInstallPromptModal({ onContinue }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Installer l’application"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">
              Ajouter l’app à l’écran d’accueil
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Pour une meilleure expérience sur iPhone, installez l’application en 10
              secondes.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
              <Share size={18} />
            </div>
            <div className="text-sm">
              <div className="font-medium text-white">1) Appuyez sur “Partager”</div>
              <div className="text-slate-300">
                Dans Safari, en bas de l’écran (icône de partage).
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
              <PlusSquare size={18} />
            </div>
            <div className="text-sm">
              <div className="font-medium text-white">
                2) “Ajouter à l’écran d’accueil”
              </div>
              <div className="text-slate-300">
                Faites défiler la liste d’actions si besoin.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <span className="text-sm font-semibold">3</span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-white">
                3) Ouvrez ensuite depuis l’écran d’accueil
              </div>
              <div className="text-slate-300">
                La connexion et le panel fonctionneront comme d’habitude.
              </div>
            </div>
          </div>
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
