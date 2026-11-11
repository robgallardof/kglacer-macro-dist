<p align="right"><a href="README.md">English</a> · <b>Español</b></p>

<h1 align="center">KGlacerMacro</h1>

<p align="center">
  Carga tus imágenes, organiza plantillas y trabaja en <a href="https://wplace.live">wplace.live</a> desde un solo panel.<br>
  Este repositorio contiene el <b>instalador oficial firmado</b>.
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js"><b>⬇ Instalar KGlacerMacro</b></a>
  &nbsp;·&nbsp;
  <a href="#extensión-companion">Extensión Companion</a>
  &nbsp;·&nbsp;
  <a href="#problemas-frecuentes">Problemas frecuentes</a>
</p>

---

## Instalación

1. Usa un **navegador Chromium de escritorio** (Chrome, Edge, Brave, Opera / Opera GX o Vivaldi).
2. Instala **[Tampermonkey Beta](https://chromewebstore.google.com/detail/gcalenpjmijncebpfijmoaglllgpjagf)**.
3. En Chrome 138 o posterior, abre `chrome://extensions`, entra en **Detalles** de Tampermonkey
   y activa **Permitir secuencias de comandos de usuario** (*Allow User Scripts*).
4. Haz clic en **[Instalar KGlacerMacro](https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js)**.
   Tampermonkey abre su página de instalación. Pulsa **Instalar**.
   - **¿Ya usabas KGlacerMacro?** Tampermonkey mostrará **Actualizar**. Se conservan tus
     imágenes, plantillas y ajustes.
5. Abre o recarga [wplace.live](https://wplace.live). La primera vez descarga la versión
   actual; después arranca al instante desde la copia local verificada.

No funciona en Firefox, Safari ni en móviles.

## Actualizaciones

Son automáticas. Cuando sale una versión nueva, KGlacerMacro la descarga en segundo plano y
muestra **"… está listo. Recarga la página para usarlo."** Recarga cuando te convenga.

El instalador (`loader.user.js`) casi nunca cambia. Tampermonkey lo actualiza desde este
repositorio.

## Extensión Companion

La entrada automática necesita la extensión opcional **KGlacer Input Companion**. El panel
muestra el botón de descarga de la versión que corresponde a tu release. Después:

1. Descomprímela, abre `chrome://extensions`, activa el **Modo de desarrollador** y pulsa
   **Cargar descomprimida**.
2. Elige la carpeta `kglacer-input-companion`.
3. En la pestaña de wplace.live, haz clic en el icono de la extensión para activar la entrada
   en esa pestaña y usa **Probar conexión** en el panel.

## Cómo se protegen las versiones

Cada versión oficial está firmada con la llave **Ed25519** del mantenedor. El instalador fija
la llave pública (su id aparece en el encabezado del script) y, en cada carga:

- verifica la firma del manifiesto de la versión;
- comprueba el tamaño y el hash **SHA-256** de la aplicación antes de ejecutarla;
- se niega a instalar una versión más antigua que una que ya aceptó;
- arranca la aplicación una sola vez.

Si algo falla, **no se ejecuta nada** y verás un aviso breve. Si el servidor de versiones no
responde, la última versión verificada sigue funcionando.

**Lo que esto no significa:** la firma demuestra de dónde viene una versión y que nadie la
alteró. No oculta el código: todo lo que se ejecuta en tu navegador se puede inspeccionar, y
puedes leerlo libremente. El instalador no está minificado a propósito.

### Verifica tú mismo el instalador

Cada nota de versión incluye el SHA-256 de `loader.user.js`:

```sh
sha256sum loader.user.js                    # Linux / macOS
certutil -hashfile loader.user.js SHA256    # Windows
```

## Tus datos

KGlacerMacro inicia sesión mediante su Control API y, como indican los metadatos del script,
sincroniza a través de ella tu token de sesión de wplace (`j`). Instálalo solo si lo aceptas.

## Problemas frecuentes

| Mensaje o síntoma | Qué hacer |
| --- | --- |
| "No se pudo verificar ni descargar" | No se ejecutó nada sin verificar. Revisa tu conexión y recarga. |
| "necesita el loader … o posterior" | Tampermonkey → Panel → selecciona KGlacerMacro → **Buscar actualizaciones**. |
| "Se rechazó una versión anterior" | No tienes que hacer nada. Sigues con la versión verificada que ya tenías. |
| No pasa nada en wplace.live | Revisa que **Permitir secuencias de comandos de usuario** esté activo (paso 3) y que el script esté habilitado en Tampermonkey. |
| Sigue sin funcionar | Abre la consola (F12) y envía las líneas que empiezan con `[KGM][Loader]`. |

## Licencia

Consulta [NOTICE.md](NOTICE.md).
