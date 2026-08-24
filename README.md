# hosq community map — Notations '26

An interactive map of the 138 people building Notations '26.

Everyone stands as a polaroid card in a ring around the name of their project —
17 rings scattered across a sheet of millimetre paper that turns once every
quarter of an hour. Open a card to read who someone is, what they practice and
where to find them. Pull a craft — piano, coding, choreography — and a trembling
thread stitches together everyone who holds it, straight across the rings,
whatever project they belong to. Everyone else steps into shadow.

## Running it

```bash
npm start
```

Serves on `PORT` (3511 by default). No dependencies, no build step: one HTML
file, one static server, one JSON file of people.

## The pieces

| | |
|---|---|
| `index.html` | the whole piece — markup, style and behaviour in one file |
| `data/people.json` | the roster: name, stage name, role, country, project, disciplines, tools, skills, links |
| `photos/` | portraits, named by their Google Drive file id |
| `fonts/` | Cera Pro, the hosq typeface |
| `assets/hosq-logo.svg` | the wordmark |
| `ingest-photos.js` | drops a folder of portraits into place (see below) |
| `server.js` | read-only static server |

## Adding portraits

Point the script at a folder. It matches files to people by the Drive id in the
filename, then by real name, then by stage name — ignoring case, punctuation,
word order and noise like `(1)` or `IMG_`.

```bash
node ingest-photos.js ~/Downloads/hosq-photos          # dry run: what would happen
node ingest-photos.js ~/Downloads/hosq-photos --write  # copy them in
```

A person with no portrait yet shows a tile with their initials and the practice
they lead with. Nothing breaks; the card just waits.

## How to move around

Drag anywhere to move across the field. Scroll or pinch to zoom. Click a card to
open it. Press and hold a card to pick it up and move it (alt-drag lifts it at
once). `Esc` lets go of whatever is holding the map — the state bar at the top
left always names it. `◎` shows everyone.
