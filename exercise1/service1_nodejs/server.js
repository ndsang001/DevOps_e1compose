const express = require('express');
const app = express();
const PORT = process.env.PORT || 8199;
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Optional integration targets
const STORAGE_URL = process.env.STORAGE_URL || '';
const SERVICE2_URL = process.env.SERVICE2_URL || '';

// Local host bind path (mapped by Docker volume)
const VSTORAGE_DIR = process.env.VSTORAGE_DIR || path.join(__dirname, 'vstorage');
const VSTORAGE_FILE = path.join(VSTORAGE_DIR, 'log.txt');

function isoUtcNoMillis(d = new Date()) {
    // Example: 2025-09-20T14:28:23Z (no milliseconds)
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getUptimeHours() {
    // Process uptime in hours reflecting container lifetime
    return (process.uptime() / 3600).toFixed(2);
}

function getFreeDiskMB() {
    // Get free disk space in MB for the root filesystem
    try {
        const out = execSync('df -k /', { encoding: 'utf-8' }).split('\n')[1].trim().split(/\s+/);
        const availableKB = parseInt(out[3], 10);
        return Math.round(availableKB / 1024); // Convert to MB
    } catch (err) {
        // Fallback if 'df' fails (unavailable)
        console.error('Error getting disk space:', err);
        return -1;
    }
}

function buildTimestamp1Line() {
    const uptimeHours = getUptimeHours();
    const freeMB = getFreeDiskMB();
    const ts = isoUtcNoMillis();
    const freeTxt = freeMB >= 0 ? `${freeMB}MB` : 'Unknown Mbytes/Disk info unavailable';
    return `Timestamp1: uptime ${uptimeHours} hours, free disk in root: ${freeTxt} @ ${ts}`;
}

// Pre-create the log file if it doesn't exist
function ensureVstorage() {
    try {
        fs.mkdirSync(VSTORAGE_DIR, { recursive: true });
        if (!fs.existsSync(VSTORAGE_FILE)) {
            fs.closeSync(fs.openSync(VSTORAGE_FILE, 'a')); // Create empty file if missing
        }
    } catch (err) {
        console.error('ensureVstorage failed:', err);
    }
}

async function appendToVStorage(record) {
    try {
        // Ensure file exists before append
        ensureVstorage();
        // Explicit 'a' flag + utf8, create if missing, no crash on error
        fs.writeFileSync(VSTORAGE_FILE, record + '\n', { flag: 'a', encoding: 'utf8' });
    } catch (err) {
        console.error('appendToVStorage failed:', err);
        // Keep responding, storage service path still records the event
    }
}

async function postToStorage(record) {
    if (!STORAGE_URL) return; // No-op if STORAGE_URL not set
    try {
        await fetch(`${STORAGE_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: record
        });
    } catch (err) {
        // Storage is not running yet or unreachable
        console.error('Error posting to STORAGE_URL:', err);
    }
}

async function fetchService2Status() {
    if (!SERVICE2_URL) return null; // No-op if SERVICE2_URL not set
    try {
        const res = await fetch(`${SERVICE2_URL}/status`);
        if (!res.ok) return null;
        return await res.text();
    } catch (err) {
        // Service2 is not running yet or unreachable
        console.error('Error fetching SERVICE2_URL:', err);
        return null;
    }
}

// Health check endpoint
app.get('/health', (_req, res) => res.type('text/plain').send('OK'));

// Status (core) endpoint
app.get('/status', async(_req, res) => {
    const line1 = buildTimestamp1Line();

    // Write to both storages (one is file, the other is HTTP POST storage service)
    await appendToVStorage(line1);
    await postToStorage(line1); //harmless if STORAGE_URL is not set

    // Try to include Service2 line if available
    const line2 = await fetchService2Status();

    const body = line2 ? `${line1}\n${line2}` : line1;
    res.type('text/plain').send(body);

});

app.listen(PORT, () => {
    console.log(`Service1 (Node.js) listening on port ${PORT}`);
});

app.get('/log', async(_req, res) => {
    if (!STORAGE_URL) {
        return res.status(503).type('text/plain').send('storage unavailable');
    }
    try {
        const data = await fetch(`${STORAGE_URL}/log`);
        const text = await data.text();
        res.type('text/plain').send(text);
    } catch (err) {
        res.status(502).type('text/plain').send('error fetching storage log: ' + err.message);
    }
});