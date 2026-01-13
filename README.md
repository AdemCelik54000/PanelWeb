# Clauddepo – dev local Netlify

Ce projet utilise des **Netlify Functions** (dans `netlify/functions`) + un front Vite.

## Tester en local comme sur Netlify (avec variables d’environnement)

1) Installer les deps

- `npm install`

2) Créer un fichier `.env` à partir de l’exemple

- Copier `.env.example` → `.env`
- Remplir avec des **clés de TEST** (Supabase + Cloudinary) pour ne pas consommer tes crédits PROD.

Variables requises côté functions:
- `AUTH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET`

3) Lancer le dev Netlify (proxy + functions)

- `npm run dev:netlify`

Ou (commande unique recommandée):
- `npm run local`
	- fait `npm install` si besoin
	- crée `.env` depuis `.env.example` si absent
	- lance `netlify dev`

URLs:
- App + functions: `http://localhost:8888/`
- L’app sert `/upload.html` et appelle `/.netlify/functions/*` comme en prod.

## Notes importantes

- En local, **l’upload Cloudinary** utilise maintenant `cloud_name` + `upload_preset` retournés par `/.netlify/functions/sign-upload`, donc tu peux switcher de compte juste en changeant les variables dans `.env`.
- Ne mets jamais les secrets dans le repo (le fichier `.env` est ignoré par git).
