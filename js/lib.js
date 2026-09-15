export const LARAMEE_FIELDS = [
  { key: 'concept', label: 'Concept', question: 'What are the authors trying to achieve? What is new?' },
  { key: 'implementation', label: 'Implementation', question: 'How is the concept realized or implemented?' },
  { key: 'relatedWork', label: 'Related Work', question: 'Which prior work does the paper build on or improve?' },
  { key: 'dataCharacteristics', label: 'Data Characteristics', question: 'What data is analyzed: dimensionality, time, size, structure, type?' },
  { key: 'visualizationTechniques', label: 'Visualization Techniques', question: 'Which visualization or analysis techniques are used?' },
  { key: 'applicationDomain', label: 'Application Domain', question: 'What domain or problem setting is addressed?' },
];

export function normalizeWhitespace(text = '') {
  return text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function clipPaperText(text, maxChars = 120000) {
  const cleaned = normalizeWhitespace(text);
  if (cleaned.length <= maxChars) return { text: cleaned, clipped: false };
  const headSize = Math.floor(maxChars * 0.72);
  const tailSize = maxChars - headSize;
  return {
    text: `${cleaned.slice(0, headSize)}\n\n[... middle of paper omitted for MVP token control ...]\n\n${cleaned.slice(-tailSize)}`,
    clipped: true,
  };
}

export function safeJsonParse(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch (_) {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch (_) {}
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }
  throw new Error('Model returned invalid JSON.');
}

export function validateExtraction(data) {
  if (!data || typeof data !== 'object') throw new Error('Extraction is empty.');
  for (const field of LARAMEE_FIELDS) {
    if (!(field.key in data)) throw new Error(`Missing field: ${field.key}`);
  }
  if (!data.title) data.title = 'Untitled paper';
  if (!data.oneSentenceSummary) data.oneSentenceSummary = data.concept?.summary || 'Summary unavailable.';
  return data;
}

export function validateDeck(deck) {
  if (!deck || typeof deck !== 'object' || !Array.isArray(deck.slides)) throw new Error('Invalid slide deck.');
  if (deck.slides.length < 3) throw new Error('Slide deck is too short.');
  return deck;
}

export function estimateReadingMinutes(text, wordsPerMinute = 180) {
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function buildExtractionPrompt(paperText) {
  return `You are PaperLens, a research-paper extraction agent following Robert S. Laramee's “How to Read a Visualization Research Paper: Extracting the Essentials”.\n\nYour job is NOT to write a generic summary. Separate concept from implementation and extract these six essentials:\n1. Concept — goal, contribution, what is new.\n2. Implementation — how the concept is realized; methods, algorithm, system or study design.\n3. Related Work — especially the one or two strongest predecessor papers or approaches and how this paper differs.\n4. Data Characteristics — dataset/source, size, dimensionality, temporal nature, structure, variable types when applicable. For non-visualization papers, adapt this to the empirical/input data actually used.\n5. Visualization Techniques — techniques used to communicate/analyze data. If the paper is not a visualization paper, state that clearly and list figures/plots/analysis representations that matter.\n6. Application Domain — field, users, tasks, and practical setting.\n\nBe evidence-grounded. For each essential return a concise summary, 2–5 bullet points, and up to 3 short evidence snippets or section/page hints when recoverable from the extracted PDF text. Do not invent citations or facts. Also identify limitations, evaluation, and future work because they are useful for a presentation.\n\nReturn ONLY a JSON object with this schema:\n{\n  "title": "...",\n  "authors": ["..."],\n  "venueYear": "...",\n  "oneSentenceSummary": "...",\n  "concept": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "implementation": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "relatedWork": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "dataCharacteristics": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "visualizationTechniques": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "applicationDomain": {"summary":"...","bullets":["..."],"evidence":["..."]},\n  "evaluation": {"summary":"...","bullets":["..."]},\n  "limitations": ["..."],\n  "futureWork": ["..."],\n  "keywords": ["..."]\n}\n\nPAPER TEXT:\n${paperText}`;
}

export function buildDeckPrompt(extraction) {
  return `You are a presentation editor. Turn the following Laramee-style research extraction into a concise teaching deck for a 4–6 minute paper summary. Keep each slide scannable.\n\nUse 7–9 slides with this default arc: title; one-sentence problem/contribution; concept; implementation; data + techniques; related work + positioning; evaluation/results; limitations/future work; takeaway. Merge or adapt slides if a category is not applicable.\n\nReturn ONLY JSON:\n{\n  "deckTitle":"...",\n  "slides":[\n    {"title":"...","kicker":"optional short eyebrow","bullets":["max 5 concise bullets"],"speakerNotes":"50-90 word narration","badge":"optional"}\n  ]\n}\n\nDo not fabricate numeric results. Preserve uncertainty when the extraction is uncertain.\n\nEXTRACTION:\n${JSON.stringify(extraction)}`;
}

export function makeDemoExtraction() {
  return {
    title: 'How to Read a Visualization Research Paper: Extracting the Essentials',
    authors: ['Robert S. Laramee'],
    venueYear: 'IEEE Computer Graphics and Applications, 2011',
    oneSentenceSummary: 'A compact method for filtering a research paper down to the information needed to understand and compare it.',
    concept: { summary: 'Extract the essential knowledge from many research papers efficiently.', bullets: ['Treat the full paper as input to a filter.', 'Capture the contribution rather than memorizing every detail.', 'Separate the idea from its realization.'], evidence: ['Section 3: Concept versus Implementation', 'Section 4: Extracting the Essentials'] },
    implementation: { summary: 'Use a six-part template to record the same comparable attributes for each paper.', bullets: ['Concept', 'Implementation', 'Related work', 'Data characteristics', 'Visualization techniques', 'Application domain'], evidence: ['Section 4 enumerates the template.'] },
    relatedWork: { summary: 'The method is positioned as part of the PhD in Visualization Starter Kit and literature-survey practice.', bullets: ['Builds on survey-writing experience.', 'Designed for students beginning literature reviews.'], evidence: [] },
    dataCharacteristics: { summary: 'Not an empirical data paper; it teaches what data attributes to extract from other papers.', bullets: ['Spatial/temporal dimensionality', 'Resolution and structure', 'Scalar/vector/tensor/multivariate type'], evidence: [] },
    visualizationTechniques: { summary: 'The paper does not introduce a new visualization technique; it teaches how to record techniques used by other papers.', bullets: ['Examples include volume rendering, flow visualization, parallel coordinates and treemaps.'], evidence: [] },
    applicationDomain: { summary: 'Research education and visualization literature review.', bullets: ['PhD candidates', 'Researchers entering a new direction', 'Survey/STAR report preparation'], evidence: [] },
    evaluation: { summary: 'The author reports classroom and survey-writing utility rather than a controlled experiment.', bullets: ['Used in data visualization coursework.', 'Methodology informed successful survey papers.'] },
    limitations: ['Focused on breadth and extracting essentials rather than deep reproduction of every paper.'],
    futureWork: ['Adapt the template to domain-specific paper types and automated evidence extraction.'],
    keywords: ['literature review', 'visualization', 'research paper', 'survey']
  };
}

export function makeDemoDeck(extraction = makeDemoExtraction()) {
  const f = extraction;
  return { deckTitle: f.title, slides: [
    { title: f.title, kicker: f.venueYear, bullets: [f.authors.join(', '), f.oneSentenceSummary], speakerNotes: 'This paper asks a practical question: when you need to read many research papers, what information is actually worth keeping? Laramee proposes a compact extraction template designed for literature reviews and survey work.', badge: 'PaperLens demo' },
    { title: 'The core idea', kicker: 'Concept', bullets: f.concept.bullets, speakerNotes: 'The central idea is to treat a paper like input to a filter. You do not need to retain every implementation detail. Instead, keep the attributes that let you understand the contribution and compare it with other papers.' },
    { title: 'Concept ≠ implementation', kicker: 'Critical distinction', bullets: ['Concept = what the work is trying to achieve.', 'Implementation = how the authors make it happen.', 'One concept can have many implementations.', 'Keeping these separate makes comparisons clearer.'], speakerNotes: 'Laramee emphasizes that an idea and its implementation are different things. This matters because papers may solve the same conceptual problem using very different algorithms or systems.' },
    { title: 'Six essentials to extract', kicker: 'The Laramee template', bullets: ['Concept', 'Implementation', 'Related work', 'Data characteristics', 'Visualization techniques'], speakerNotes: 'The method records six consistent attributes. The sixth is application domain. This fixed schema is what makes the approach useful for comparing tens or hundreds of papers.' },
    { title: 'Why related work matters', kicker: 'Positioning', bullets: ['Find the strongest predecessor papers.', 'State explicitly what this paper inherits.', 'State explicitly what changes or improves.', 'Avoid turning a survey into a list of disconnected papers.'], speakerNotes: 'A key warning is that a literature survey should not become a list of paper summaries. The relationships between papers are part of the knowledge you are trying to construct.' },
    { title: 'Breadth before depth', kicker: 'Reading strategy', bullets: ['Use the template to scan broadly across a field.', 'Identify mature areas and unsolved directions.', 'Go deep only on papers that matter most.', 'Ask authors or reproduce methods when implementation detail becomes important.'], speakerNotes: 'This technique is optimized for breadth. It helps researchers map a field before deciding which papers deserve deeper study or reproduction.' },
    { title: 'What PaperLens automates', kicker: 'Our MVP', bullets: ['Extract PDF text locally in the browser.', 'Use DeepSeek to fill the six-part template.', 'Keep evidence snippets beside each claim.', 'Generate a short teaching deck and narration.', 'Export PPTX and an animated WebM video.'], speakerNotes: 'PaperLens turns the template into a small browser agent. The AI is constrained by the schema, so the result is closer to a literature-review note than an unconstrained generic summary.' },
    { title: 'Takeaway', kicker: 'One sentence', bullets: [f.oneSentenceSummary, 'A useful paper summary is structured, comparable, and evidence-grounded.'], speakerNotes: 'The takeaway is simple: do not summarize everything. Extract the small set of attributes that reveal what is new, how it works, what it builds on, and where it applies.' }
  ]};
}
