# Clauddepo – Application Mobile de Gestion de Portfolio

**Clauddepo** est une application web mobile conçue pour simplifier la gestion de **portfolios d’images pour les professionnels**.
Elle permet d’uploader, organiser et gérer des images facilement, tout en prenant en charge **plusieurs clients (multi-tenant)** ainsi que la gestion d’un **emploi du temps**.

L’application est pensée pour être **simple, rapide et optimisée pour mobile**.

---

# Fonctionnalités principales

## Gestion des images

L’application permet de gérer facilement un portfolio d’images :

* Upload d’images
* Affichage des images dans une galerie
* Réorganisation de l’ordre des images
* Suppression d’images

Cette fonctionnalité est idéale pour :

* portfolios professionnels
* galeries de projets
* présentations pour clients

---

## Support multi-clients (Multi-Tenant)

Clauddepo permet de gérer **plusieurs clients dans une seule application**.

Chaque client possède :

* son propre espace sécurisé
* son dossier d’images
* ses paramètres
* son emploi du temps

Les données sont séparées afin que **chaque client n’accède qu’à ses propres informations**.

---

## Gestion de l’emploi du temps

L’application permet également de gérer un **planning de travail**.

Fonctionnalités :

* affichage des horaires
* modification des horaires
* configuration par jour

Exemple :

| Jour     | Début | Fin   |
| -------- | ----- | ----- |
| Lundi    | 09:00 | 18:00 |
| Mardi    | 10:00 | 17:00 |
| Mercredi | 09:00 | 16:00 |

---

## Optimisé pour mobile

L’application est conçue comme une **Progressive Web App (PWA)** :

* interface responsive
* utilisation simple sur smartphone
* expérience proche d’une application native

---

## Authentification sécurisée

L’accès à l’application est protégé par :

* authentification sécurisée
* mots de passe hachés
* accès séparé pour chaque client

---

# Fonctionnalités configurables

Certaines fonctionnalités peuvent être **activées ou désactivées pour chaque client**.

| Fonctionnalité  | Description                                |
| --------------- | ------------------------------------------ |
| Images          | active ou désactive la gestion des images  |
| Emploi du temps | active ou désactive la gestion du planning |

Cela permet d’adapter l’application selon les besoins de chaque utilisateur.

---

# Stack technique

Le projet utilise les technologies suivantes :

* **Vite** pour le frontend
* **Netlify Functions** pour les fonctions backend
* **Supabase** pour la base de données
* **Cloudinary** pour le stockage et la gestion des images
* **JWT** pour l’authentification

---

# Objectif du projet

Clauddepo a été créé pour fournir une **solution simple et mobile** permettant aux professionnels de :

* gérer leurs portfolios
* organiser leurs images
* travailler avec plusieurs clients
* gérer leur planning

Le tout dans une **interface rapide, moderne et optimisée pour mobile**.
