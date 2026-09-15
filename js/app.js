import { LARAMEE_FIELDS, clipPaperText, safeJsonParse, validateExtraction, validateDeck, buildExtractionPrompt, buildDeckPrompt, makeDemoExtraction, makeDemoDeck, estimateReadingMinutes } from './lib.js';

const $ = (sel) => document.querySelector(sel);
const els = {
  file: $('#paperFile'), key: $('#apiKey'), endpoint: $('#endpoint'), model: $('#model'),
  run: $('#runBtn'), demo: $('#demoBtn'), reset: $('#resetBtn'), progress: $('#progressBar'),
  progressText: $('#progressText'), log: $('#activityLog'), summary: $('#summaryGrid'),
  slides: $('#slides'), exportPpt: $('#exportPpt'), exportVideo: $('#exportVideo'),
  play: $('#playDeck'), stop: $('#stopDeck'), statusPill: $('#statusPill'), pdfMeta: $('#pdfMeta'),
  resultArea: $('#resultArea'), advanced: $('#advancedToggle'), advancedPanel: $('#advancedPanel')
};

const state = { pdfText: '', extraction: null, deck: null, playing: false, currentSlide: 0, speech: null };

function log(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.innerHTML = `<span class="log-dot"></span><div><b>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</b><span>${escapeHtml(message)}</span></div>`;
  els.log.prepend(item);
}
function setProgress(value, text) { els.progress.style.width = `${value}%`; els.progressText.textContent = text; }
function setStatus(text, tone='idle') { els.statusPill.textContent = text; els.statusPill.dataset.tone = tone; }
function escapeHtml(s='') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function extractPdf(file) {
  log(`Reading ${file.name} locally with PDF.js…`);
  const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map(i => i.str).join(' ');
    pages.push(`\n--- Page ${p} ---\n${text}`);
    setProgress(Math.min(18, 4 + Math.round((p/pdf.numPages)*14)), `Extracting PDF · page ${p}/${pdf.numPages}`);
  }
  const text = pages.join('\n');
  els.pdfMeta.textContent = `${pdf.numPages} pages · ${text.length.toLocaleString()} extracted characters · ~${estimateReadingMinutes(text)} min human reading`;
  return text;
}

async function deepseekJson({ apiKey, endpoint, model, prompt, stage }) {
  log(`${stage}: sending a structured request to ${model}.`);
  const res = await fetch(endpoint.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, stream: false, temperature: 0.2 })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${stage} failed: HTTP ${res.status}. ${text.slice(0, 260)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${stage} returned no content.`);
  return safeJsonParse(content);
}

function renderExtraction(extraction) {
  els.summary.innerHTML = '';
  for (const field of LARAMEE_FIELDS) {
    const value = extraction[field.key] || {};
    const card = document.createElement('article');
    card.className = 'summary-card';
    card.innerHTML = `<div class="summary-label">${escapeHtml(field.label)}</div><h3>${escapeHtml(value.summary || 'Not identified')}</h3><ul>${(value.bullets || []).slice(0,5).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>${value.evidence?.length ? `<details><summary>Evidence</summary>${value.evidence.slice(0,3).map(x => `<p>${escapeHtml(x)}</p>`).join('')}</details>` : ''}`;
    els.summary.appendChild(card);
  }
}

function renderDeck(deck) {
  els.slides.innerHTML = '';
  deck.slides.forEach((slide, i) => {
    const card = document.createElement('article');
    card.className = 'slide-card';
    card.dataset.index = i;
    card.innerHTML = `<div class="slide-num">${String(i+1).padStart(2,'0')}</div><div class="slide-mini"><span>${escapeHtml(slide.kicker || 'PaperLens')}</span><h3>${escapeHtml(slide.title)}</h3><ul>${(slide.bullets||[]).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>${slide.badge ? `<em>${escapeHtml(slide.badge)}</em>`:''}</div><button class="notes-btn" aria-label="Show speaker notes">Notes</button><div class="speaker-notes">${escapeHtml(slide.speakerNotes || '')}</div>`;
    card.querySelector('.notes-btn').addEventListener('click', () => card.classList.toggle('show-notes'));
    els.slides.appendChild(card);
  });
  els.exportPpt.disabled = false; els.exportVideo.disabled = false; els.play.disabled = false;
}

async function run() {
  try {
    const file = els.file.files[0];
    const apiKey = els.key.value.trim();
    if (!file) throw new Error('Choose a PDF first.');
    if (!apiKey) throw new Error('Enter your DeepSeek API key.');
    els.run.disabled = true; els.resultArea.hidden = false; setStatus('Working', 'working');
    setProgress(2, 'Opening PDF'); log('Agent run started.', 'ok');
    state.pdfText = await extractPdf(file);
    const clipped = clipPaperText(state.pdfText);
    if (clipped.clipped) log('Paper text was clipped for the MVP context budget; beginning and ending sections were preserved.', 'warn');
    setProgress(24, 'Laramee extraction · concept vs implementation');
    state.extraction = validateExtraction(await deepseekJson({ apiKey, endpoint: els.endpoint.value.trim(), model: els.model.value.trim(), prompt: buildExtractionPrompt(clipped.text), stage: 'Laramee extractor' }));
    log(`Extracted six essentials for “${state.extraction.title}”.`, 'ok'); renderExtraction(state.extraction);
    setProgress(70, 'Presentation editor · building story');
    state.deck = validateDeck(await deepseekJson({ apiKey, endpoint: els.endpoint.value.trim(), model: els.model.value.trim(), prompt: buildDeckPrompt(state.extraction), stage: 'Slide editor' }));
    renderDeck(state.deck); log(`Built ${state.deck.slides.length} presentation slides with speaker notes.`, 'ok');
    setProgress(100, 'Ready · export PPTX or video'); setStatus('Ready', 'ready');
  } catch (err) {
    console.error(err); log(err.message, 'error'); setStatus('Needs attention', 'error');
    setProgress(0, 'Stopped');
    if (/Failed to fetch|NetworkError|CORS/i.test(err.message)) log('Browser-to-API request may be blocked by CORS. Open Advanced and point Endpoint to an OpenAI-compatible CORS proxy you control, or run the site through a tiny backend proxy.', 'warn');
  } finally { els.run.disabled = false; }
}

function runDemo() {
  state.extraction = makeDemoExtraction(); state.deck = makeDemoDeck(state.extraction);
  els.resultArea.hidden = false; renderExtraction(state.extraction); renderDeck(state.deck);
  els.pdfMeta.textContent = 'Demo mode · no PDF or API key used'; setProgress(100, 'Demo ready'); setStatus('Demo ready', 'ready');
  log('Loaded deterministic demo based on Laramee’s own reading-paper method.', 'ok');
}

async function exportPptx() {
  if (!state.deck) return;
  if (!window.PptxGenJS) throw new Error('PptxGenJS did not load.');
  log('Rendering editable PowerPoint in the browser…');
  const pptx = new window.PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'PaperLens'; pptx.subject = 'AI-generated paper summary'; pptx.title = state.deck.deckTitle || 'Paper summary'; pptx.company = 'PaperLens'; pptx.lang = 'en-US';
  state.deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F7F8FC' };
    slide.addShape('rect', { x:0, y:0, w:13.333, h:0.18, fill:{color:'6757FF'}, line:{color:'6757FF'} });
    slide.addText((s.kicker || 'PAPERLENS').toUpperCase(), { x:0.8, y:0.55, w:8.8, h:0.35, fontFace:'Aptos', fontSize:11, bold:true, color:'6757FF', charSpacing:1.4, margin:0 });
    slide.addText(s.title, { x:0.8, y:1.02, w:11.7, h:1.1, fontFace:'Aptos Display', fontSize:30, bold:true, color:'17182B', margin:0, breakLine:false, fit:'shrink' });
    const bullets = (s.bullets || []).slice(0,6).map(t => ({ text:t, options:{bullet:{indent:18}, hanging:4, breakLine:true} }));
    slide.addText(bullets, { x:1.0, y:2.35, w:11.2, h:3.8, fontFace:'Aptos', fontSize:18, color:'34364A', breakLine:true, paraSpaceAfterPt:12, valign:'mid', margin:0.04, fit:'shrink' });
    slide.addText(`${String(i+1).padStart(2,'0')} / ${String(state.deck.slides.length).padStart(2,'0')}`, { x:11.1, y:6.85, w:1.35, h:0.25, fontSize:10, color:'777A8F', align:'right', margin:0 });
    if (s.speakerNotes && slide.addNotes) slide.addNotes(s.speakerNotes);
  });
  await pptx.writeFile({ fileName: `${slugify(state.deck.deckTitle || 'paper-summary')}.pptx` });
  log('PowerPoint exported.', 'ok');
}

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'paper-summary'; }

function drawSlide(ctx, slide, index, total, width, height, progress=1) {
  ctx.fillStyle = '#f7f8fc'; ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#6757ff'; ctx.fillRect(0,0,width,12);
  ctx.font = '700 25px system-ui'; ctx.fillStyle = '#6757ff'; ctx.fillText((slide.kicker || 'PAPERLENS').toUpperCase(), 80, 100);
  ctx.fillStyle = '#17182b'; ctx.font = '800 55px system-ui'; wrapText(ctx, slide.title, 80, 190, width-160, 68, 2);
  ctx.font = '400 31px system-ui'; ctx.fillStyle = '#34364a'; let y=340;
  const visible = Math.ceil((slide.bullets || []).length * Math.min(1, progress*1.5));
  (slide.bullets || []).slice(0,visible).forEach(b => { ctx.fillStyle='#6757ff'; ctx.beginPath(); ctx.arc(98,y-9,7,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#34364a'; y = wrapText(ctx, b, 125, y, width-220, 43, 2) + 30; });
  ctx.font='500 20px system-ui'; ctx.fillStyle='#777a8f'; ctx.fillText(`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`, width-150, height-55);
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines=99) {
  const words = String(text||'').split(/\s+/); let line=''; let lines=0;
  for (let n=0;n<words.length;n++) { const test=line+words[n]+' '; if (ctx.measureText(test).width>maxWidth && n>0) { ctx.fillText(line,x,y); line=words[n]+' '; y+=lineHeight; lines++; if(lines>=maxLines) break; } else line=test; }
  if(lines<maxLines) ctx.fillText(line,x,y); return y+lineHeight;
}

async function exportVideo() {
  if (!state.deck) return;
  log('Rendering animated WebM video locally. Audio narration remains available in Preview mode.', 'info');
  const canvas = document.createElement('canvas'); canvas.width=1280; canvas.height=720; const ctx=canvas.getContext('2d');
  const stream = canvas.captureStream(30); const chunks=[];
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4_000_000}); rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  rec.start(500); setStatus('Rendering video', 'working');
  const perSlide=2600, fps=30;
  for (let i=0;i<state.deck.slides.length;i++) {
    for (let f=0;f<fps*perSlide/1000;f++) { drawSlide(ctx,state.deck.slides[i],i,state.deck.slides.length,canvas.width,canvas.height,Math.min(1,f/(fps*.7))); await sleep(1000/fps); }
    setProgress(Math.round(((i+1)/state.deck.slides.length)*100), `Rendering video · slide ${i+1}/${state.deck.slides.length}`);
  }
  rec.stop(); await new Promise(r=>rec.onstop=r); const blob=new Blob(chunks,{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${slugify(state.deck.deckTitle||'paper-summary')}.webm`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setStatus('Ready','ready'); setProgress(100,'Video exported'); log('WebM video exported.', 'ok');
}

async function playDeck() {
  if (!state.deck || state.playing) return; state.playing=true; els.play.disabled=true; els.stop.disabled=false;
  for (let i=0;i<state.deck.slides.length && state.playing;i++) {
    state.currentSlide=i; document.querySelectorAll('.slide-card').forEach((c,j)=>c.classList.toggle('active',i===j)); document.querySelector(`.slide-card[data-index="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
    const s=state.deck.slides[i]; if ('speechSynthesis' in window && s.speakerNotes) { const u=new SpeechSynthesisUtterance(s.speakerNotes); u.rate=1.03; state.speech=u; speechSynthesis.speak(u); await new Promise(resolve=>{u.onend=resolve;u.onerror=resolve;}); } else await sleep(4200);
  }
  stopDeck();
}
function stopDeck(){ state.playing=false; window.speechSynthesis?.cancel(); state.speech=null; els.play.disabled=!state.deck; els.stop.disabled=true; document.querySelectorAll('.slide-card').forEach(c=>c.classList.remove('active')); }
function reset(){ stopDeck(); state.pdfText='';state.extraction=null;state.deck=null;els.file.value='';els.key.value='';els.summary.innerHTML='';els.slides.innerHTML='';els.resultArea.hidden=true;els.exportPpt.disabled=true;els.exportVideo.disabled=true;els.play.disabled=true;setProgress(0,'Waiting for a paper');setStatus('Idle','idle');els.pdfMeta.textContent='PDF stays in your browser until text is sent to the selected API endpoint.';log('Workspace reset.'); }

els.run.addEventListener('click',run); els.demo.addEventListener('click',runDemo); els.reset.addEventListener('click',reset); els.exportPpt.addEventListener('click',()=>exportPptx().catch(e=>log(e.message,'error'))); els.exportVideo.addEventListener('click',()=>exportVideo().catch(e=>log(e.message,'error'))); els.play.addEventListener('click',playDeck); els.stop.addEventListener('click',stopDeck); els.advanced.addEventListener('click',()=>els.advancedPanel.classList.toggle('open'));
log('Ready. Upload a research paper or try Demo mode.');
