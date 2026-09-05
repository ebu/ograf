const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;
const UNIX_VERSION = 0x0314;
const DOS_DATE_1980_01_01 = 0x0021;
const UNIX_FILE_MODE = (0o100644 << 16) >>> 0;
const CRC32_POLYNOMIAL = 0xedb88320;
const textEncoder = new TextEncoder();

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
        value = (value >>> 1) ^ ((value & 1) ? CRC32_POLYNOMIAL : 0);
    }

    return value >>> 0;
});

function concatenate(arrays) {
    const output = new Uint8Array(
        arrays.reduce((total, array) => total + array.byteLength, 0)
    );
    let offset = 0;
    for (const array of arrays) {
        output.set(array, offset);
        offset += array.byteLength;
    }

    return output;
}

function calculateCrc32(contents) {
    let value = 0xffffffff;
    for (const byte of contents) {
        value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
    }

    return (value ^ 0xffffffff) >>> 0;
}

function createLocalFileRecord(file) {
    const fileName = textEncoder.encode(file.path);
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    const checksum = calculateCrc32(file.contents);

    view.setUint32(0, LOCAL_FILE_SIGNATURE, true);
    view.setUint16(4, ZIP_VERSION, true);
    view.setUint16(6, UTF8_FLAG, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, DOS_DATE_1980_01_01, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, file.contents.byteLength, true);
    view.setUint32(22, file.contents.byteLength, true);
    view.setUint16(26, fileName.byteLength, true);
    view.setUint16(28, 0, true);

    return {
        checksum,
        contents: file.contents,
        fileName,
        record: concatenate([header, fileName, file.contents])
    };
}

function createCentralDirectoryRecord(entry, localHeaderOffset) {
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);

    view.setUint32(0, CENTRAL_DIRECTORY_SIGNATURE, true);
    view.setUint16(4, UNIX_VERSION, true);
    view.setUint16(6, ZIP_VERSION, true);
    view.setUint16(8, UTF8_FLAG, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, DOS_DATE_1980_01_01, true);
    view.setUint32(16, entry.checksum, true);
    view.setUint32(20, entry.contents.byteLength, true);
    view.setUint32(24, entry.contents.byteLength, true);
    view.setUint16(28, entry.fileName.byteLength, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, UNIX_FILE_MODE, true);
    view.setUint32(42, localHeaderOffset, true);

    return concatenate([header, entry.fileName]);
}

function createEndRecord(entryCount, directorySize, directoryOffset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    view.setUint32(0, END_SIGNATURE, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, directorySize, true);
    view.setUint32(16, directoryOffset, true);
    view.setUint16(20, 0, true);

    return record;
}

export function createZipArchive(files) {
    const sortedFiles = [...files].sort((left, right) => {
        if (left.path < right.path) return -1;
        if (left.path > right.path) return 1;
        return 0;
    });
    const localRecords = [];
    const centralDirectoryRecords = [];
    let localHeaderOffset = 0;

    for (const file of sortedFiles) {
        const entry = createLocalFileRecord(file);
        localRecords.push(entry.record);
        centralDirectoryRecords.push(
            createCentralDirectoryRecord(entry, localHeaderOffset)
        );
        localHeaderOffset += entry.record.byteLength;
    }

    const localData = concatenate(localRecords);
    const centralDirectory = concatenate(centralDirectoryRecords);
    const endRecord = createEndRecord(
        sortedFiles.length,
        centralDirectory.byteLength,
        localData.byteLength
    );

    return concatenate([localData, centralDirectory, endRecord]);
}
