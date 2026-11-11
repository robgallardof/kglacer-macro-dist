<a id="top"></a>

<!-- kit:lang -->
<p align="right"><a href="README.md"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/lang-en-01-dark.svg" /><img src="assets/readme-builder/kit/lang-en-01-light.svg" alt="English" height="34" /></picture></a>&nbsp;
<a href="README.es.md"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/lang-en-02-dark.svg" /><img src="assets/readme-builder/kit/lang-en-02-light.svg" alt="Español" height="34" /></picture></a></p>
<!-- /kit:lang -->

<p align="center"><img src="assets/readme-builder/kit/logo.svg" width="88" height="88" alt="KGlacerMacro" /></p>

<h1 align="center">KGlacerMacro</h1>

<!-- kit:hero -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/hero-en-dark.svg" /><img src="assets/readme-builder/kit/hero-en-light.svg" alt="Install once, stay up to date" width="100%" /></picture></p>
<!-- /kit:hero -->

<!-- kit:nav -->
<p align="center"><a href="#install"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/nav-en-01-dark.svg" /><img src="assets/readme-builder/kit/nav-en-01-light.svg" alt="01 Install" height="34" /></picture></a>&nbsp;
<a href="#updates"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/nav-en-02-dark.svg" /><img src="assets/readme-builder/kit/nav-en-02-light.svg" alt="02 Updates" height="34" /></picture></a>&nbsp;
<a href="#companion"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/nav-en-03-dark.svg" /><img src="assets/readme-builder/kit/nav-en-03-light.svg" alt="03 Extension" height="34" /></picture></a>&nbsp;
<a href="#security"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/nav-en-04-dark.svg" /><img src="assets/readme-builder/kit/nav-en-04-light.svg" alt="04 Security" height="34" /></picture></a>&nbsp;
<a href="#help"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/nav-en-05-dark.svg" /><img src="assets/readme-builder/kit/nav-en-05-light.svg" alt="Help" height="34" /></picture></a></p>
<!-- /kit:nav -->

Load your images, organize templates and work on [wplace.live](https://wplace.live) from one panel. This repository hosts the **official signed installer**: it downloads each release, checks its signature and only then runs it.

<!-- kit:downloads -->
<p align="center"><a href="https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/downloads-en-01-dark.svg" /><img src="assets/readme-builder/kit/downloads-en-01-light.svg" alt="Install KGlacerMacro" height="44" /></picture></a>&nbsp;
<a href="https://chromewebstore.google.com/detail/gcalenpjmijncebpfijmoaglllgpjagf"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/downloads-en-02-dark.svg" /><img src="assets/readme-builder/kit/downloads-en-02-light.svg" alt="Tampermonkey Beta" height="44" /></picture></a></p>
<!-- /kit:downloads -->

<!-- kit:facts -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/facts-en-dark.svg" /><img src="assets/readme-builder/kit/facts-en-light.svg" alt="Ed25519 signed releases · SHA-256 checked before running · Auto background updates · Offline last verified copy" width="100%" /></picture></p>
<!-- /kit:facts -->

![Illustrative KGlacerMacro panel layout](assets/guide/desktop-en.svg)

<sub>The illustration shows an example layout; it is not a screenshot of a live session.</sub>

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="install"></a>

<!-- kit:h-install -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-install-en-dark.svg" /><img src="assets/readme-builder/kit/h-install-en-light.svg" alt="Install in four steps" width="100%" /></picture></p>
<!-- /kit:h-install -->

1. Use a **desktop Chromium browser**: Chrome, Edge, Brave, Opera / Opera GX or Vivaldi.
2. Install **[Tampermonkey Beta](https://chromewebstore.google.com/detail/gcalenpjmijncebpfijmoaglllgpjagf)**.
3. Open your browser's extensions page, click **Details** on Tampermonkey and turn on **Allow User Scripts** (Chrome 138 and newer):

<!-- kit:browser-pages -->
<p align="center"><a href="chrome://extensions"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/browser-pages-en-01-dark.svg" /><img src="assets/readme-builder/kit/browser-pages-en-01-light.svg" alt="Chrome / Brave" height="34" /></picture></a>&nbsp;
<a href="edge://extensions"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/browser-pages-en-02-dark.svg" /><img src="assets/readme-builder/kit/browser-pages-en-02-light.svg" alt="Edge" height="34" /></picture></a>&nbsp;
<a href="opera://extensions"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/browser-pages-en-03-dark.svg" /><img src="assets/readme-builder/kit/browser-pages-en-03-light.svg" alt="Opera / Opera GX" height="34" /></picture></a>&nbsp;
<a href="vivaldi://extensions"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/browser-pages-en-04-dark.svg" /><img src="assets/readme-builder/kit/browser-pages-en-04-light.svg" alt="Vivaldi" height="34" /></picture></a></p>
<!-- /kit:browser-pages -->

4. Click **[Install KGlacerMacro](https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js)** and then **Install** on the Tampermonkey page.

Open or reload [wplace.live](https://wplace.live). The first load downloads the current release; later loads start instantly from the verified copy in your browser.

> **Already using KGlacerMacro?** Tampermonkey shows **Update** instead of Install. Your images, templates and settings are kept.

Firefox, Safari and mobile browsers are not supported.

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="updates"></a>

<!-- kit:h-updates -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-updates-en-dark.svg" /><img src="assets/readme-builder/kit/h-updates-en-light.svg" alt="Updates take care of themselves" width="100%" /></picture></p>
<!-- /kit:h-updates -->

New versions download in the background. When one is ready, the page shows **"KGlacerMacro … is ready. Reload the page to use it."** Reload whenever it suits you.

The installer itself (`loader.user.js`) rarely changes; Tampermonkey keeps it up to date from this repository.

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="companion"></a>

<!-- kit:h-companion -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-companion-en-dark.svg" /><img src="assets/readme-builder/kit/h-companion-en-light.svg" alt="Connect the companion" width="100%" /></picture></p>
<!-- /kit:h-companion -->

Automatic input uses the optional **KGlacer Input Companion**. The panel's **Download extension ZIP** button always matches your release.

1. Unzip it, open the extensions page, enable **Developer mode** and click **Load unpacked**.
2. Select the `kglacer-input-companion` folder that contains `manifest.json`.
3. On the wplace.live tab, click the extension icon to turn input on for that tab.
4. In the panel, go to **Config** and click **Test connection**.

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="security"></a>

<!-- kit:h-security -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-security-en-dark.svg" /><img src="assets/readme-builder/kit/h-security-en-light.svg" alt="How releases are protected" width="100%" /></picture></p>
<!-- /kit:h-security -->

Every official release is signed with the maintainer's key. The installer pins the public key (its id is in the script header) and checks every release on your machine before running it.

<!-- kit:protections -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/protections-en-dark.svg" /><img src="assets/readme-builder/kit/protections-en-light.svg" alt="Only official releases: The manifest must carry a valid Ed25519 signature from the pinned key. · Nothing altered on the way: Size and SHA-256 are checked before any code runs. · Never back to an old version: Releases older than one already trusted are refused. · Works if the server is down: The last verified copy keeps running from local storage." width="100%" /></picture></p>
<!-- /kit:protections -->

If a check fails, **nothing is run** and you see a short message. The installer is deliberately not minified, so you can read exactly what it does.

Signing proves where a release comes from and that it was not altered. It does **not** hide the code: everything that runs in your browser can be inspected.

Every release note lists the installer's SHA-256. Compare it with your copy (`certutil -hashfile loader.user.js SHA256` on Windows):

<!-- kit:verify -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/verify-en-dark.svg" /><img src="assets/readme-builder/kit/verify-en-light.svg" alt="$ sha256sum loader.user.js / 93540cdc4a214c556a8f30def445ec985f03145244c4b0e43aa86f9ad400da82  loader.user.js" width="100%" /></picture></p>
<!-- /kit:verify -->

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="data"></a>

<!-- kit:h-data -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-data-en-dark.svg" /><img src="assets/readme-builder/kit/h-data-en-light.svg" alt="Your data" width="100%" /></picture></p>
<!-- /kit:h-data -->

KGlacerMacro signs you in through its Control API and, as stated in the script metadata, syncs your wplace session token (`j`) through it. Only install it if you accept that.

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<a id="help"></a>

<!-- kit:h-help -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/h-help-en-dark.svg" /><img src="assets/readme-builder/kit/h-help-en-light.svg" alt="If something goes wrong" width="100%" /></picture></p>
<!-- /kit:h-help -->

| What you see | What to do |
| --- | --- |
| "could not be verified or downloaded" | Nothing unverified was run. Check your connection and reload. |
| "needs loader … or newer" | Tampermonkey → Dashboard → KGlacerMacro → **Check for updates**. |
| "An older release … was rejected" | Nothing to do: you keep the verified release you already have. |
| Nothing happens on wplace.live | Check that **Allow User Scripts** is on and the script is enabled in Tampermonkey. |
| Still stuck | Press F12 and include the console lines starting with `[KGM][Loader]` in your report. |

<!-- kit:support -->
<p align="center"><a href="https://github.com/robgallardof/kglacer-macro-dist/issues"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/support-en-01-dark.svg" /><img src="assets/readme-builder/kit/support-en-01-light.svg" alt="Report an issue" height="34" /></picture></a>&nbsp;
<a href="NOTICE.md"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/support-en-02-dark.svg" /><img src="assets/readme-builder/kit/support-en-02-light.svg" alt="Licenses" height="34" /></picture></a></p>
<!-- /kit:support -->

<!-- kit:wave -->
<p align="center"><img src="assets/readme-builder/kit/wave.svg" alt="" width="100%" /></p>
<!-- /kit:wave -->

<!-- kit:back -->
<p align="center"><a href="#top"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme-builder/kit/back-en-01-dark.svg" /><img src="assets/readme-builder/kit/back-en-01-light.svg" alt="Back to top" height="34" /></picture></a></p>
<!-- /kit:back -->

<p align="center"><a href="https://github.com/robgallardof"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/readme/brand/signature-es-dark.svg" /><img src="assets/readme/brand/signature-es-light.svg" alt="Roberto Gallardo · KGlacerMacro" width="100%" /></picture></a></p>
