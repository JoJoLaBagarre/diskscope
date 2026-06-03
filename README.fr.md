# DiskScope

> Analyseur d'espace disque, recherche floue ultra-rapide et désinstalleur d'applications — pour Windows, Linux et macOS.

DiskScope est une petite application de bureau rapide qui vous aide à comprendre
**ce qui occupe de l'espace sur votre disque**, à **trouver fichiers et dossiers
instantanément** (bien plus vite que l'Explorateur), et à **désinstaller des
applications** via le désinstalleur natif du système — le tout dans une interface
claire (thème clair/sombre).

Construit avec **Tauri 2** (backend Rust, interface web) + **React + TypeScript**.

🇬🇧 *[Read in English](README.md)*

---

## Fonctionnalités

- **Analyse disque** — parcours parallèle (jwalk), agrégation des tailles,
  table virtualisée des plus gros éléments, explorateur arborescent avec fil
  d'Ariane, et **treemap** zoomable. La progression est diffusée en temps réel ;
  le résultat est mis en cache pour un rechargement instantané. Les tailles
  reflètent l'**espace réellement occupé** (les fichiers creux/compressés
  comptent pour ce qu'ils occupent vraiment).
- **Recherche** — recherche floue instantanée (nucleo) sur l'arborescence
  indexée, avec filtres par type, extension, taille et date. Résultats
  virtualisés fluides même à 100 000+ lignes.
- **Applications** — liste des applications installées (registre Windows +
  Microsoft Store) avec éditeur, version et taille ; désinstallation via le
  désinstalleur natif avec **confirmation obligatoire affichant la commande
  exacte** et élévation (UAC) si nécessaire. Filtre par disque, tri par
  nom/taille.
- **Suppression multiple** avec fenêtre de progression non bloquante, et
  **vidage de la corbeille** en un clic.
- **Anglais & Français**, thèmes clair & sombre, et **mise à jour automatique**.

## Installation

Téléchargez le dernier installeur depuis la page des
[Releases](https://github.com/JoJoLaBagarre/diskscope/releases) :

- **Windows** — `DiskScope_x.y.z_x64_en-US.msi` ou `DiskScope_x.y.z_x64-setup.exe`
- **Linux** — `.AppImage` ou `.deb`
- **macOS** — `.dmg`

L'application se met à jour seule : lorsqu'une nouvelle version signée est
publiée, DiskScope propose de la télécharger et de l'installer.

## Compilation

### Prérequis
- [Rust](https://rustup.rs/) (stable ; toolchain MSVC sous Windows)
- [Node.js](https://nodejs.org/) 20+
- **Windows** : WebView2 (préinstallé sur Windows 11) + Visual Studio Build Tools
- **Linux** : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`, `patchelf`,
  `libappindicator3-dev`
- **macOS** : Xcode Command Line Tools

### Développement
```bash
npm install
npm run tauri dev
```

### Build de production
```bash
npm run tauri build
```

## Licence

[MIT](LICENSE) © `JoJoLaBagarre`
