import assert from 'node:assert/strict';
import { crc32, inflateRawSync } from 'node:zlib';

// Independent reader: use the ZIP central directory and Node's CRC/deflate,
// never the browser writer or its assumptions about local record order.
export function readZip(input) {
    const zip = Buffer.from(input);
    let end = zip.length - 22;
    const minimum = Math.max(0, zip.length - 65557);
    while (end >= minimum && zip.readUInt32LE(end) !== 0x06054b50) end--;
    assert(end >= minimum, 'ZIP end record missing');
    assert.equal(end + 22 + zip.readUInt16LE(end + 20), zip.length, 'ZIP length');
    assert.equal(zip.readUInt32LE(end + 4), 0, 'Multi-disk ZIP unsupported');
    const count = zip.readUInt16LE(end + 10);
    assert.equal(zip.readUInt16LE(end + 8), count, 'ZIP entry count');
    let offset = zip.readUInt32LE(end + 16);
    const directoryEnd = offset + zip.readUInt32LE(end + 12);
    assert.equal(directoryEnd, end, 'ZIP directory bounds');
    const files = new Map();
    for (let i = 0; i < count; i++) {
        assert.equal(zip.readUInt32LE(offset), 0x02014b50, 'ZIP central record');
        const flags = zip.readUInt16LE(offset + 8);
        assert.equal(flags & 1, 0, 'Encrypted ZIP unsupported');
        const method = zip.readUInt16LE(offset + 10);
        const checksum = zip.readUInt32LE(offset + 16);
        const packed = zip.readUInt32LE(offset + 20);
        const size = zip.readUInt32LE(offset + 24);
        const nameLength = zip.readUInt16LE(offset + 28);
        const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
        assert(name && !files.has(name), 'Duplicate or empty ZIP path');
        assert(!name.startsWith('/') && !name.includes('\\') && !name.split('/').includes('..')
            && !/^[a-z]+:/i.test(name), 'Unsafe ZIP path');
        const local = zip.readUInt32LE(offset + 42);
        assert.equal(zip.readUInt32LE(local), 0x04034b50, 'ZIP local record');
        assert.equal(zip.readUInt16LE(local + 8), method, 'ZIP method mismatch');
        const localNameLength = zip.readUInt16LE(local + 26);
        assert.equal(zip.subarray(local + 30, local + 30 + localNameLength).toString('utf8'), name, 'ZIP name mismatch');
        const start = local + 30 + localNameLength + zip.readUInt16LE(local + 28);
        assert(start + packed <= zip.readUInt32LE(end + 16), 'ZIP data bounds');
        const bytes = zip.subarray(start, start + packed);
        assert([0, 8].includes(method), `Unsupported ZIP method ${method}`);
        const contents = method === 8 ? inflateRawSync(bytes) : bytes;
        assert.equal(contents.length, size, 'ZIP uncompressed size');
        assert.equal(crc32(contents), checksum, `ZIP CRC: ${name}`);
        files.set(name, contents);
        offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
    }
    assert.equal(offset, directoryEnd, 'ZIP directory size');
    return files;
}
