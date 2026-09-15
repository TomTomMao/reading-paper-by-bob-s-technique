# PaperLens

> Live repository: https://github.com/TomTomMao/reading-paper-by-bob-s-technique

A static browser app that turns a research-paper PDF into a **Laramee-style structured extraction**, presentation slides, and an animated WebM video.

The extraction contract follows Robert S. Laramee, *How to Read a Visualization Research Paper: Extracting the Essentials* (IEEE CG&A, 2011, DOI `10.1109/MCG.2011.44`):

1. Concept
2. Implementation
3. Related Work
4. Data Characteristics
5. Visualization Techniques
6. Application Domain

## MVP features

- PDF upload and local text extraction with PDF.js
- User-supplied DeepSeek API key (kept in browser memory only)
- Two-stage JavaScript agent: structured Laramee extraction → presentation editor
- Evidence snippets alongside each extraction category
- Agent activity/progress UI (not hidden chain-of-thought)
- Editable `.pptx` export using PptxGenJS
- Animated `.webm` export using Canvas + MediaRecorder
- Browser speech-synthesis narration during preview
- Demo mode that works without a key
- Unit tests + GitHub Actions
- GitHub Pages deployment workflow

## Run locally

Because PDF.js uses an ES module worker, serve the folder over HTTP rather than double-clicking `index.html`.

```bash
npm test
npm run serve
```

Open `http://localhost:8080`.

## Deploy on GitHub Pages

1. Push to `main`.
2. In **Settings → Pages**, choose **GitHub Actions** as the source if it is not already selected.
3. The included `.github/workflows/pages.yml` deploys the static site.

No build step is required.

## DeepSeek API

The default endpoint is:

```text
https://api.deepseek.com
```

The default model in the UI is `deepseek-flash`.

The browser sends the extracted paper text directly to the chosen endpoint. The API key is read from the password field only when a request is made and is not placed in LocalStorage/sessionStorage.

### CORS caveat

A pure static GitHub Pages app can only call an API that permits browser cross-origin requests. If the provider blocks CORS for your origin, the UI will report a network error. Open **Advanced settings** and use an OpenAI-compatible CORS proxy that *you control*, or add a tiny serverless proxy. Do not send private papers or API keys through an untrusted public proxy.

## Video caveat

The exported MVP `.webm` is silent because browsers do not expose `speechSynthesis` audio as a capturable `MediaStream`. **Preview + narration** does speak the generated notes with the browser's local speech engine. A v2 can add a TTS provider and mux audio into the exported video.

## Architecture

```text
PDF
 └─ PDF.js text extraction (browser)
      └─ Laramee Extractor Agent (DeepSeek JSON)
          ├─ Concept
          ├─ Implementation
          ├─ Related Work
          ├─ Data Characteristics
          ├─ Visualization Techniques
          └─ Application Domain
              └─ Presentation Editor Agent (DeepSeek JSON)
                  ├─ HTML slide previews
                  ├─ PptxGenJS → .pptx
                  └─ Canvas + MediaRecorder → .webm
```

## Privacy / security

- The project contains **no API key**.
- The entered key is not persisted by PaperLens.
- PDF parsing occurs in the browser.
- Extracted text is sent to the endpoint when summarisation starts.
- For confidential papers, prefer a backend you control and review provider data-handling terms.

## License

MIT for the app code. The Laramee paper itself is not bundled into this repository; the app references its methodology and DOI.
