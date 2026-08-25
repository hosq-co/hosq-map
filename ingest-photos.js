#!/usr/bin/env node
/*  Wire a folder of portraits into the map.
 *
 *    node ingest-photos.js <folder>          see what would happen
 *    node ingest-photos.js <folder> --write  do it
 *
 *  Files are matched to people by name, in this order:
 *    1. the Google Drive file id in the filename (that is how the CSV named them)
 *    2. the person's real name        — "Kai Khachatryan.jpg"
 *    3. the person's artistic name    — "XANDRA.png"
 *  Matching ignores case, punctuation, transliteration dashes and word order,
 *  so "khachatryan_kai (1).JPEG" still lands on Kai Khachatryan.
 *
 *  Every accepted file is copied into ./photos/<driveId or slug>.jpg and the
 *  person's `photo` field is set. Nothing is deleted; unmatched files are
 *  listed so a human can decide.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'people.json');
const PHOTOS = path.join(ROOT, 'photos');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

const src = process.argv[2];
const write = process.argv.includes('--write');
if (!src) { console.error('usage: node ingest-photos.js <folder> [--write]'); process.exit(1); }
if (!fs.existsSync(src)) { console.error('no such folder: ' + src); process.exit(1); }

// words that say nothing about who is in the picture
const JUNK = new Set(['portrait', 'photo', 'foto', 'pic', 'picture', 'image', 'img', 'dsc',
  'final', 'edit', 'edited', 'copy', 'crop', 'cropped', 'small', 'web', 'hosq', 'notations',
  'jpeg', 'jpg', 'png', 'heic', 'scan', 'new', 'orig', 'original', 'avatar', 'profile']);

const words = s => (s || '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // ć → c, ё → e
  .toLowerCase()
  .replace(/\.[a-z0-9]+$/, '')          // extension
  .replace(/[’'`]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .split(' ')
  .filter(w => w && !JUNK.has(w) && !/^\d+$/.test(w));   // drop "(1)", "2024", counters

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const byDriveId = new Map();
const names = [];                        // [{words:Set, person}]
for (const p of db.people) {
  const id = p.photo || p.photoRemote;
  if (id) byDriveId.set(id, p);
  for (const n of [p.name, p.artistic]) {
    if (!n) continue;
    const w = words(n);
    if (w.length) names.push({ set: new Set(w), person: p });
  }
}

const files = fs.readdirSync(src).filter(f => !f.startsWith('.') && EXT.has(path.extname(f).toLowerCase()));
const matched = [], unmatched = [], collisions = [], ambiguous = [];
const taken = new Map();

for (const f of files) {
  const driveId = (f.match(/[-\w]{25,}/) || [])[0];
  let person = driveId && byDriveId.get(driveId);
  if (!person) {
    // a file belongs to the person whose every name-word appears in the filename
    const fw = new Set(words(f));
    const hits = [];
    for (const { set, person: cand } of names) {
      if (set.size && [...set].every(w => fw.has(w)) && !hits.includes(cand)) hits.push(cand);
    }
    if (hits.length === 1) person = hits[0];
    else if (hits.length > 1) {
      ambiguous.push(`${f} → could be ${hits.map(h => h.artistic).join(' / ')}`);
      continue;
    }
  }
  if (!person) { unmatched.push(f); continue; }
  if (taken.has(person.id)) { collisions.push(`${f} → ${person.artistic} (already had ${taken.get(person.id)})`); continue; }
  taken.set(person.id, f);
  matched.push({ file: f, person });
}

const slug = p => (p.photo || p.photoRemote ||
  words(p.name).join('-') + '-' + p.id);

console.log(`${files.length} files in folder · ${matched.length} matched · ${unmatched.length} unmatched`);
if (collisions.length) console.log('\nTWO FILES FOR ONE PERSON:\n  ' + collisions.join('\n  '));
if (unmatched.length) console.log('\nNOT MATCHED (rename to the person\'s name, or drop):\n  ' + unmatched.join('\n  '));

const without = db.people.filter(p => !taken.has(p.id));
if (without.length) console.log(`\nSTILL WITHOUT A PORTRAIT (${without.length}):\n  ` +
  without.map(p => p.artistic).join(', '));

if (!write) { console.log('\ndry run — add --write to copy the files and update data/people.json'); process.exit(0); }

fs.mkdirSync(PHOTOS, { recursive: true });
for (const { file, person } of matched) {
  const name = slug(person) + '.jpg';
  fs.copyFileSync(path.join(src, file), path.join(PHOTOS, name));
  person.photo = slug(person);
}
fs.writeFileSync(DATA, JSON.stringify(db, null, 1));
console.log(`\nwrote ${matched.length} portraits into photos/ and updated data/people.json`);
console.log('note: .heic files are copied as-is and will not display — convert those to jpg first');
