# MiData

> **MD = MiData** — Un lector de archivos `.md` para GitHub Pages con audio player integrado.

[![Status](https://img.shields.io/badge/Status-Active-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()

---

## 🎯 Qué es

MiData es un engine SPA ultra-ligero que convierte cualquier repo de GitHub con archivos `.md` en un sitio web navegable y legible, con:

- 📂 **Sidebar automático** — Lee la estructura del repo y genera navegación
- 🔗 **Cross-file navigation** — Links entre archivos `.md` funcionan nativamente
- 📑 **Table of Contents** — Headers de cada archivo como TOC en sidebar
- 🎵 **Audio Player** — Links a archivos de audio se convierten en players inline
- 🌙 **Dark mode** — Diseño oscuro optimizado para lectura
- 📱 **Responsive** — Mobile-first con sidebar colapsable

## 🚀 Uso

### 1. En tu repo de contenido, crea `index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Proyecto</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/imLeGEnDco55/MiData@main/miData.css">
</head>
<body>
  <div id="miData" data-repo="TU_USUARIO/TU_REPO" data-title="Mi Proyecto"></div>
  <script src="https://cdn.jsdelivr.net/gh/imLeGEnDco55/MiData@main/miData.js"></script>
</body>
</html>
```

### 2. Activa GitHub Pages:
`Settings → Pages → Source: main branch`

### 3. Listo.
Tus `.md` se renderizan automáticamente en `https://tu-usuario.github.io/tu-repo/`

---

## 🎵 Audio Player

Para insertar un audio player inline en cualquier `.md`:

```markdown
[▶ Nombre del Track](audio/mi-cancion.mp3)
```

Formatos soportados: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`, `.aac`

Si tienes una carpeta `audio/` en tu repo, aparecerá en el sidebar con todos los archivos de audio listados.

---

## ⚙️ Configuración

| Atributo | Descripción | Default |
|----------|-------------|----------|
| `data-repo` | `usuario/repo` de GitHub | *requerido* |
| `data-title` | Título del sitio | nombre del repo |
| `data-branch` | Branch a leer | `main` |

---

## 📁 Estructura

```
MiData/
├── miData.js      ← Engine core
├── miData.css     ← Estilos
├── README.md      ← Este archivo
└── template/
    └── index.html ← Template para copiar en repos de contenido
```

---

## 📜 Licencia

MIT — Úsalo como quieras.
