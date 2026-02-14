# CONTEXT.md — MiData

## Estado: v1.0 Funcional

## Qué es
Engine SPA que renderiza archivos `.md` como sitio web en GitHub Pages.
No usa frameworks. Vanilla JS + CSS. Carga marked.js desde CDN.

## Stack
- Vanilla JS (miData.js)
- Vanilla CSS (miData.css)
- marked.js (CDN, runtime)
- GitHub API (tree fetch)
- GitHub raw content (file fetch)

## Arquitectura
```
[Repo: MiData]  →  Engine (JS + CSS)
  Se sirve via jsDelivr CDN

[Repo: XYZ]     →  Solo contenido .md + 1 index.html
  GH Pages carga MiData desde CDN
```

## Decisiones
- **No Jekyll**: No soporta plugins JS custom en GH Pages
- **No React/Vue**: Overkill. Vanilla JS es suficiente
- **jsDelivr CDN**: Cache automático de archivos GitHub con versionado
- **Hash routing**: `#/archivo.md` para SPA sin server
- **marked.js**: Ligero, GFM compliant, extensible

## Funcionalidades
- [x] Sidebar auto-generado desde estructura del repo
- [x] Cross-file navigation
- [x] In-page TOC
- [x] Audio player inline
- [x] Dark mode
- [x] Mobile responsive
- [x] Breadcrumbs
