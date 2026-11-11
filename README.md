<p align="right"><b>English</b> · <a href="README.es.md">Español</a></p>

<h1 align="center">KGlacerMacro</h1>

<p align="center">
  Load your images, organize templates and work on <a href="https://wplace.live">wplace.live</a> from one panel.<br>
  This repository hosts the <b>official signed installer</b>.
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js"><b>⬇ Install KGlacerMacro</b></a>
  &nbsp;·&nbsp;
  <a href="#companion-extension">Companion extension</a>
  &nbsp;·&nbsp;
  <a href="#troubleshooting">Troubleshooting</a>
</p>

---

## Install

1. Use a **desktop Chromium browser** (Chrome, Edge, Brave, Opera / Opera GX or Vivaldi).
2. Install **[Tampermonkey Beta](https://chromewebstore.google.com/detail/gcalenpjmijncebpfijmoaglllgpjagf)**.
3. On Chrome 138 or newer, open `chrome://extensions`, click **Details** on Tampermonkey
   and turn on **Allow User Scripts**.
4. Click **[Install KGlacerMacro](https://raw.githubusercontent.com/robgallardof/kglacer-macro-dist/main/loader.user.js)**.
   Tampermonkey opens its install page. Click **Install**.
   - **Already using KGlacerMacro?** Tampermonkey shows **Update** instead. Your images,
     templates and settings are kept.
5. Open or reload [wplace.live](https://wplace.live). The first load downloads the current
   release, and later loads start instantly from the verified local copy.

Firefox, Safari and mobile browsers are not supported.

## Updates

They are automatic. When a new version is published, KGlacerMacro downloads it in the
background and shows **"… is ready. Reload the page to use it."** Reload when it suits you.

The installer itself (`loader.user.js`) rarely changes. Tampermonkey updates it from this
repository.

## Companion extension

Automatic input needs the optional **KGlacer Input Companion**. The panel shows a download
button for the version that matches your release. Then:

1. Unzip it, open `chrome://extensions`, enable **Developer mode** and click **Load unpacked**.
2. Select the `kglacer-input-companion` folder.
3. On the wplace.live tab, click the extension icon to enable input for that tab, then use
   **Test connection** in the panel.

## How releases are protected

Each official release is signed with the maintainer's **Ed25519** key. The installer pins
the public key (its id is in the script header) and, on every page load:

- verifies the signature of the release manifest,
- checks the size and **SHA-256** hash of the application before running it,
- refuses to install a version older than one it already trusted,
- starts the application exactly once.

If anything fails, **nothing is run** and you see a short error. If the release server is
unreachable, the last verified version keeps working.

**What this does not mean:** signing proves where a release comes from and that it was
not altered. It does not hide the code. Everything that runs in your browser can be
inspected, and you are welcome to read it. The installer is deliberately not minified.

### Verify the installer yourself

Every release note lists the SHA-256 of `loader.user.js`:

```sh
sha256sum loader.user.js                    # Linux / macOS
certutil -hashfile loader.user.js SHA256    # Windows
```

## Your data

KGlacerMacro signs you in through its Control API and, as stated in the script metadata,
syncs your wplace session token (`j`) through it. Only install it if you accept that.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| "could not be verified or downloaded" | Nothing unverified was run. Check your connection and reload. |
| "needs loader … or newer" | Tampermonkey → Dashboard → select KGlacerMacro → **Check for updates**. |
| "An older release … was rejected" | No action needed. You keep the verified release you have. |
| Nothing happens on wplace.live | Make sure **Allow User Scripts** is on (step 3) and the script is enabled in Tampermonkey. |
| Still stuck | Open the console (F12) and send the lines starting with `[KGM][Loader]`. |

## License

See [NOTICE.md](NOTICE.md).
