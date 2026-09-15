import test from 'node:test';
import assert from 'node:assert/strict';
import { clipPaperText, safeJsonParse, validateExtraction, validateDeck, makeDemoExtraction, makeDemoDeck, LARAMEE_FIELDS } from '../js/lib.js';

test('Laramee schema exposes six essentials', () => assert.equal(LARAMEE_FIELDS.length, 6));
test('clipPaperText preserves short text', () => assert.deepEqual(clipPaperText('hello', 10), {text:'hello', clipped:false}));
test('clipPaperText clips long text', () => { const out=clipPaperText('x'.repeat(100),50); assert.equal(out.clipped,true); assert.ok(out.text.includes('omitted')); });
test('safeJsonParse handles fenced JSON', () => assert.deepEqual(safeJsonParse('```json\n{"a":1}\n```'), {a:1}));
test('demo extraction validates', () => assert.equal(validateExtraction(makeDemoExtraction()).authors[0], 'Robert S. Laramee'));
test('demo deck validates', () => assert.ok(validateDeck(makeDemoDeck()).slides.length >= 7));
test('invalid extraction is rejected', () => assert.throws(() => validateExtraction({concept:{}}), /Missing field/));
test('invalid deck is rejected', () => assert.throws(() => validateDeck({slides:[]}), /too short/));
