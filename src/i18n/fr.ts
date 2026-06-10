// French catalog. Typed as Record<TranslationKey, string> so the compiler flags
// any key present in en.ts but missing here.

import type { TranslationKey } from "./en";

export const fr: Record<TranslationKey, string> = {
  // ----- navigation / shell -----
  "nav.scan": "Analyse disque",
  "nav.search": "Recherche",
  "nav.apps": "Applications",
  "nav.options": "Options",
  "nav.about": "À propos",
  "shell.ipcConnected": "IPC connecté · v{version}",
  "shell.ipcUnavailable": "IPC indisponible",
  "shell.connecting": "connexion…",
  "shell.scanningTitle": "Analyse en cours",

  // ----- top bar titles -----
  "title.scan": "Analyse du disque",
  "title.search": "Recherche",
  "title.apps": "Applications installées",
  "title.options": "Options",
  "title.about": "À propos",

  // ----- common -----
  "common.cancel": "Annuler",
  "common.loading": "Chargement…",
  "common.retry": "Réessayer",
  "common.close": "Fermer",
  "common.reset": "Réinitialiser",
  "common.elements": "{count} éléments",
  "common.empty": "Rien à afficher.",

  // ----- volume picker -----
  "picker.heading": "Que voulez-vous analyser ?",
  "picker.subtitle": "Choisissez un disque, ou sélectionnez un dossier précis.",
  "picker.loadingVolumes": "Chargement des volumes…",
  "picker.free": "{size} libres",
  "picker.outOf": "sur {size}",
  "picker.browse": "Parcourir un dossier…",
  "picker.cancelled": "Analyse annulée.",
  "picker.volumesError": "Impossible de lister les disques. Utilisez « Parcourir un dossier ».",

  // ----- scan progress -----
  "scan.progressTitle": "Analyse en cours…",
  "scan.files": "fichiers",
  "scan.folders": "dossiers",
  "scan.analyzed": "analysés",

  // ----- scan results -----
  "results.changeTarget": "Changer de cible",
  "results.rescan": "Ré-analyser",
  "results.files": "{count} fichiers",
  "results.folders": "{count} dossiers",
  "results.ignored": "{count} ignorés",
  "results.cache": "cache · {date}",
  "results.tabLargest": "Plus volumineux",
  "results.tabExplorer": "Explorateur",
  "results.tabTreemap": "Treemap",
  "results.emptyBin": "Vider la corbeille",

  // ----- table headers / kinds -----
  "table.name": "Nom",
  "table.share": "Part",
  "table.size": "Taille",
  "table.modified": "Modifié",
  "table.select": "Sél.",
  "kind.all": "Tout",
  "kind.files": "Fichiers",
  "kind.folders": "Dossiers",
  "explorer.empty": "Dossier vide.",
  "treemap.hint": "Cliquez un dossier pour zoomer",
  "treemap.emptyLevel": "Rien à afficher à ce niveau.",
  "treemap.tileLabel": "{name}, {size}",

  // ----- row actions -----
  "action.reveal": "Révéler dans l'explorateur",
  "action.trash": "Envoyer à la corbeille",
  "action.confirmTrashOne": "Envoyer à la corbeille ?\n\n{path}\n({size})",
  "action.confirmTrashMany": "Envoyer {count} élément(s) à la corbeille ?\n({size})",

  // ----- selection bar -----
  "selection.summary": "{count} élément(s) sélectionné(s) · {size}",
  "selection.clear": "Effacer",
  "selection.delete": "Supprimer la sélection",

  // ----- trash progress -----
  "trash.title": "Suppression…",
  "trash.progress": "{done} / {total} éléments",
  "trash.elapsed": "Écoulé : {seconds}s",
  "trash.failedNote": "{count} élément(s) n'ont pas pu être supprimés.",
  "trash.doneTitle": "Suppression terminée",
  "trash.doneSummary": "{removed} élément(s) supprimé(s){failed}.",
  "trash.doneFailedSuffix": ", {count} en échec",

  // ----- search -----
  "search.placeholder": "Rechercher un fichier ou un dossier…",
  "search.needScanTitle": "Lancez d'abord une analyse",
  "search.needScanBody":
    "La recherche s'appuie sur l'arborescence indexée lors d'une analyse. Ouvrez l'onglet « Analyse disque » et scannez un disque ou un dossier, puis revenez ici pour une recherche floue instantanée.",
  "search.clear": "Effacer",
  "search.results": "{count} résultat(s)",
  "search.resultsLimited": "{count} résultat(s) (limités à {limit})",
  "search.searching": "Recherche…",
  "search.indexed": "{count} éléments indexés",
  "search.staleBanner":
    "Des changements ont été détectés sur le disque — les résultats peuvent être obsolètes. Relancez une analyse pour les actualiser.",
  "search.noResults": "Aucun résultat.",

  // ----- search filters -----
  "filter.extension": "Extension",
  "filter.extensionPlaceholder": "pdf, jpg…",
  "filter.sizeMB": "Taille (Mo)",
  "filter.min": "min",
  "filter.max": "max",
  "filter.modifiedAfter": "Modifié après",
  "filter.modifiedBefore": "avant",

  // ----- applications -----
  "apps.filterPlaceholder": "Filtrer les applications…",
  "apps.allDrives": "Tous les disques",
  "apps.drive": "Disque {letter}",
  "apps.stats": "{count} applications · {size}",
  "apps.refresh": "Actualiser",
  "apps.enumerating": "Énumération des applications installées…",
  "apps.none": "Aucune application.",
  "apps.unavailableTitle": "Applications indisponibles",
  "apps.uninstall": "Désinstaller",
  "apps.publisherUnknown": "Éditeur inconnu",
  "apps.store": "Store",
  "apps.footnote":
    "* Affiche les applications signalées par Windows (registre + Microsoft Store). Certains composants système et applications sans désinstalleur sont volontairement masqués.",

  // ----- uninstall dialog -----
  "uninstall.title": "Désinstaller « {name} » ?",
  "uninstall.body":
    "Le désinstalleur natif du système va être lancé. Cette action est irréversible.",
  "uninstall.commandLabel": "Commande exécutée",
  "uninstall.elevation": "⚠ Des droits administrateur seront demandés (UAC).",
  "uninstall.confirm": "Désinstaller",
  "uninstall.running": "Désinstallation…",
  "uninstall.resultOk": "Désinstallation",
  "uninstall.resultFail": "Échec",
  "uninstall.error": "Erreur",

  // ----- empty recycle bin -----
  "bin.button": "Vider la corbeille",
  "bin.confirm":
    "Vider toute la corbeille Windows ?\n\nCela supprime définitivement tout son contenu ({count} élément(s), {size}) — pas seulement les fichiers supprimés par DiskScope.",
  "bin.empty": "La corbeille est déjà vide.",
  "bin.done": "Corbeille vidée.",
  "bin.title": "Corbeille",
  "bin.contains": "Corbeille : {count} élément(s) · {size}",
  "bin.unsupported": "Le vidage de la corbeille n'est pris en charge que sous Windows.",

  // ----- scan footnote -----
  "scan.footnote":
    "* Les tailles reflètent l'espace réellement occupé sur le disque. Les fichiers creux ou compressés (ex. images de VM) comptent pour ce qu'ils occupent vraiment, ce qui peut être bien inférieur à leur taille annoncée.",

  // ----- options -----
  "options.language": "Langue",
  "options.languageDesc": "Langue de l'interface.",
  "options.appearance": "Apparence",
  "options.appearanceDesc": "Thème de couleurs.",
  "options.themeSystem": "Système",
  "options.themeLight": "Clair",
  "options.themeDark": "Sombre",
  "options.maintenance": "Maintenance",
  "options.maintenanceDesc": "Libérez de l'espace sur votre machine.",
  "options.updates": "Mises à jour",
  "options.currentVersion": "Version actuelle : {version}",
  "options.checkUpdates": "Rechercher des mises à jour",
  "options.checking": "Vérification…",
  "options.upToDate": "DiskScope est à jour.",
  "options.updateAvailable": "La version {version} est disponible.",
  "options.downloadInstall": "Télécharger et installer",
  "options.installing": "Installation… {percent}%",
  "options.updateError": "Impossible de vérifier les mises à jour.",
  "options.repoLink": "Voir le projet sur GitHub",

  // ----- update banner -----
  "update.bannerText": "DiskScope {version} est disponible.",
  "update.bannerAction": "Mettre à jour",
  "update.bannerDismiss": "Plus tard",

  // ----- about -----
  "about.tagline": "Analyse d'espace disque, recherche et désinstallation — {version}",
  "about.featScan": "Analyse disque",
  "about.featScanDesc":
    "Parcours parallèle, plus gros éléments, explorateur arborescent et treemap zoomable.",
  "about.featSearch": "Recherche",
  "about.featSearchDesc":
    "Recherche floue instantanée avec filtres type / extension / taille / date.",
  "about.featApps": "Applications",
  "about.featAppsDesc":
    "Désinstallation via le désinstalleur natif du système, avec confirmation et aperçu de la commande.",
  "about.system": "Système : {os} ({arch})",
  "about.builtWith": "Construit avec Tauri 2 · React · Rust",
};
