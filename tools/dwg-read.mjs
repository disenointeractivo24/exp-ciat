// Reads the CIAT DWG and dumps a JSON summary + all entities (as polylines) for inspection.
import { readFileSync, writeFileSync } from 'node:fs';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const file = process.argv[2];
const out = process.argv[3];
const libredwg = await LibreDwg.create('./node_modules/@mlightcad/libredwg-web/wasm/');
const buf = readFileSync(file);
const dwg = libredwg.dwg_read_data(new Uint8Array(buf).buffer, Dwg_File_Type.DWG);
const db = libredwg.convert(dwg);
const ents = db.entities ?? [];
const counts = {};
const layers = {};
for (const e of ents) { counts[e.type] = (counts[e.type] ?? 0) + 1; layers[e.layer] = (layers[e.layer] ?? 0) + 1; }
console.log('entities', ents.length);
console.log('types', counts);
console.log('layers', layers);
console.log('header keys', Object.keys(db.header ?? {}).slice(0, 30));
console.log('units', db.header?.INSUNITS, 'extmin', db.header?.EXTMIN, 'extmax', db.header?.EXTMAX);
writeFileSync(out, JSON.stringify({ header: { INSUNITS: db.header?.INSUNITS, EXTMIN: db.header?.EXTMIN, EXTMAX: db.header?.EXTMAX }, entities: ents }, (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
libredwg.dwg_free(dwg);
