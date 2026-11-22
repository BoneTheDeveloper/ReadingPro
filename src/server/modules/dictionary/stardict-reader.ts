// Reads a StarDict dictionary straight out of its zip archive. Relative,
// dependency-free imports only: scripts/import-dictionary.ts runs this file
// under plain Node.
import { gunzipSync, inflateRawSync } from "node:zlib";

export type StardictRecord = { word: string; definition: string };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** Returns every file of a zip archive, decompressed, keyed by its path. */
function unzip(zip: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record sits in the last 22 bytes plus an optional comment.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip archive");

  const files = new Map<string, Buffer>();
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== CENTRAL_SIGNATURE) throw new Error("Corrupt zip central directory");
    const method = zip.readUInt16LE(p + 10);
    const compressedSize = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLength);
    p += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;

    if (zip.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) throw new Error(`Corrupt zip entry ${name}`);
    const start = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const data = zip.subarray(start, start + compressedSize);
    if (method === METHOD_STORED) files.set(name, data);
    else if (method === METHOD_DEFLATE) files.set(name, inflateRawSync(data));
    else throw new Error(`Unsupported zip compression method ${method} for ${name}`);
  }
  return files;
}

/**
 * Yields every headword of the StarDict dictionary in `zip` with its definition
 * text. Expects one `.idx` (32-bit offsets) and one `.dict.dz` or `.dict`.
 */
export function* readStardictZip(zip: Buffer): Generator<StardictRecord> {
  const files = unzip(zip);
  const find = (suffix: string) => [...files.keys()].find((name) => name.endsWith(suffix));

  const idxName = find(".idx");
  const dictName = find(".dict.dz") ?? find(".dict");
  if (!idxName || !dictName) throw new Error("The archive has no StarDict .idx and .dict files");

  const idx = files.get(idxName)!;
  const dictRaw = files.get(dictName)!;
  // dictzip is gzip with a random-access header, so plain gunzip reads it.
  const dict = dictName.endsWith(".dz") ? gunzipSync(dictRaw) : dictRaw;

  let p = 0;
  while (p < idx.length) {
    const end = idx.indexOf(0, p);
    if (end < 0) throw new Error("Corrupt StarDict index");
    const word = idx.toString("utf8", p, end);
    const offset = idx.readUInt32BE(end + 1);
    const size = idx.readUInt32BE(end + 5);
    p = end + 9;
    yield { word, definition: dict.toString("utf8", offset, offset + size) };
  }
}
