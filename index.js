const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// Settings file management
const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');
const readSettings = () => {
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch {
        return { script_url: null };
    }
};
const writeSettings = (data) => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));

// Keys file management (simplified for Vercel)
const KEYS_FILE = path.join(__dirname, '..', 'keys.json');
const getKeys = () => {
    try {
        return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    } catch {
        return [];
    }
};
const saveKeys = (keys) => fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));

// Admin Authentication
const adminAuth = (req, res, next) => {
    try {
        jwt.verify(req.headers['authorization'], process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// ========== ADMIN ENDPOINTS ==========

app.post('/admin/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) {
        res.json({ token: jwt.sign({ role: 'admin' }, process.env.JWT_SECRET) });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.get('/admin/data', adminAuth, (req, res) => {
    const keys = getKeys();
    const onlineCount = keys.filter(k => k.lastSeen && new Date(k.lastSeen).getTime() > Date.now() - 300000).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let execsToday = 0;
    keys.forEach(k => {
        execsToday += (k.logs || []).filter(l => new Date(l.time) > todayStart).length;
    });
    res.json({ keys, onlineCount, executionsToday: execsToday });
});

app.get('/admin/logs/:key', adminAuth, (req, res) => {
    const keys = getKeys();
    const key = keys.find(k => k.key === req.params.key);
    res.json(key ? (key.logs || []).reverse() : []);
});

app.post('/admin/action', adminAuth, (req, res) => {
    const { action, key } = req.body;
    let keys = getKeys();
    
    if (action === 'create') {
        const newKey = 'KEY-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        keys.push({ key: newKey, discordId: null, hwid: null, ip: null, isBlacklisted: false, logs: [], createdAt: new Date() });
    } else if (action === 'delete') {
        keys = keys.filter(k => k.key !== key);
    } else if (action === 'reset') {
        const k = keys.find(k => k.key === key);
        if (k) { k.hwid = null; k.ip = null; }
    } else if (action === 'blacklist') {
        const k = keys.find(k => k.key === key);
        if (k) { k.isBlacklisted = !k.isBlacklisted; }
    }
    
    saveKeys(keys);
    res.json({ success: true });
});

app.get('/admin/script', adminAuth, (req, res) => {
    const s = readSettings();
    res.json({ script_url: s.script_url });
});

app.post('/admin/script', adminAuth, (req, res) => {
    const { script_url } = req.body;
    if (!script_url) return res.status(400).json({ error: 'Missing script_url' });
    writeSettings({ script_url });
    res.json({ success: true });
});

// ========== API ENDPOINTS ==========

// Script Payload API (with token validation & browser block)
app.get('/api/payload', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(403).send("You do not have access");
        }
        
        jwt.verify(token, process.env.JWT_SECRET);
        
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.toLowerCase().includes('mozilla')) {
            return res.status(403).send("You do not have access");
        }
        
        const s = readSettings();
        const gh = await axios.get(s.script_url || "https://raw.githubusercontent.com/projecter94/Vanta/refs/heads/main/Vanta%200.7%20obfuscated%201.txt");
        res.send(gh.data);
    } catch (e) {
        res.status(403).send("You do not have access");
    }
});

// Serve dashboard.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

module.exports = app;
