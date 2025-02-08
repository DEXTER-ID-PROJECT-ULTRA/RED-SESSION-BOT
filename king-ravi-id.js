import dotenv from 'dotenv';
dotenv.config();

import {
    makeWASocket,
    Browsers,
    fetchLatestBaileysVersion,
    DisconnectReason,
    useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Handler, Callupdate, GroupUpdate } from './kingravi.js';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import NodeCache from 'node-cache';
import path from 'path';
import chalk from 'chalk';
import moment from 'moment-timezone';
import axios from 'axios';
import config from './config.cjs';
import pkg from './auto.cjs';

const { emojis, doReact } = pkg;
const sessionName = "session";
const app = express();
const PORT = process.env.PORT || 3000;
let useQR = false;

const logger = pino({ level: 'silent' });
const msgRetryCounterCache = new NodeCache();
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function downloadSessionData() {
    if (!config.SESSION_ID) {
        console.error('Please add your session to SESSION_ID env !!');
        return false;
    }

    try {
        await fs.promises.writeFile(credsPath, Buffer.from(config.SESSION_ID, 'base64').toString('utf-8'));
        return true;
    } catch (error) {
        console.error("❌ Failed to save session file:", error);
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const Matrix = makeWASocket({
            version,
            logger,
            printQRInTerminal: useQR,
            browser: ["Cyber-Dexter-ID", "safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
        });

        Matrix.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log("🔄 Reconnecting...");
                    start();
                } else {
                    console.log("🚫 Logged out! Delete session and scan again.");
                }
            } else if (connection === 'open') {
                console.log("✅ Bot Connected!");
                const autoMessage = '✅ Bot Successfully Connected! 🚀\n🔥 Cyber-Dexter-ID Bot is now online.';
                try {
                    await Matrix.sendMessage('94789958225@s.whatsapp.net', { text: autoMessage });
                } catch (err) {
                    console.error('❌ Failed to send Auto Message:', err);
                }
            }
        });

        Matrix.ev.on('creds.update', saveCreds);
        Matrix.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, Matrix, logger));
        Matrix.ev.on("call", async (json) => await Callupdate(json, Matrix));
        Matrix.ev.on("group-participants.update", async (messag) => await GroupUpdate(Matrix, messag));

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.message) return;
                if (mek.key.fromMe) return;

                if (config.AUTO_REACT) {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await doReact(randomEmoji, mek, Matrix);
                }

                if (mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);

                    if (config.AUTO_STATUS_REPLY) {
                        const customMessage = config.STATUS_READ_MSG || '*✅ Auto Status Seen Bot By CKING RAVI*';
                        await Matrix.sendMessage(mek.key.remoteJid, { text: customMessage }, { quoted: mek });
                    }
                }
            } catch (err) {
                console.error('❌ Error in messages.upsert:', err);
            }
        });

    } catch (error) {
        console.error('❌ Critical Error:', error);
        process.exit(1);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        console.log("🔒 Session file found, proceeding without QR code.");
        await start();
    } else {
        const sessionDownloaded = await downloadSessionData();
        if (sessionDownloaded) {
            console.log("🔒 Session downloaded, starting bot.");
            await start();
        } else {
            console.log("No session found or downloaded, QR code will be printed for authentication.");
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => {
    res.send('𝙲𝚈𝙱𝙴𝚁-𝙳𝙴𝚇𝚃𝙴𝚁-𝙸𝙳 is Online!');
});

app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});
