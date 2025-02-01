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
const orange = chalk.bold.hex("#FFA500");
const lime = chalk.bold.hex("#32CD32");
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;

const MAIN_LOGGER = pino({
    timestamp: () => `,"time":"${new Date().toJSON()}"`
});
const logger = MAIN_LOGGER.child({});
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

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

    // Decode Base64 Session ID
    const decodedSession = Buffer.from(config.SESSION_ID, 'base64').toString('utf-8');

    try {
        await fs.promises.writeFile(credsPath, decodedSession);
        return true;
    } catch (error) {
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: useQR,
            browser: ["Cyber-Dexter-Id", "safari", "3.3"],
            auth: state,
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg.message || undefined;
                }
                return { conversation: "Cyber-Dexter-Id whatsapp user bot" };
            }
        });

        Matrix.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    start();
                }
            } else if (connection === 'open') {
                const targetNumber = '94789958225@s.whatsapp.net'; // Target number
                const autoMessage = '✅ Bot Successfully Connected! 🚀\n🔥 Cyber-Dexter-ID Bot is now online.';
                
                try {
                    await Matrix.sendMessage(targetNumber, { text: autoMessage });
                } catch (err) {
                    console.error('❌ Failed to send Auto Message:', err);
                }
            }
        });

        Matrix.ev.on('creds.update', saveCreds);
        Matrix.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, Matrix, logger));
        Matrix.ev.on("call", async (json) => await Callupdate(json, Matrix));
        Matrix.ev.on("group-participants.update", async (messag) => await GroupUpdate(Matrix, messag));

        if (config.MODE === "public") {
            Matrix.public = true;
        } else if (config.MODE === "private") {
            Matrix.public = false;
        }

        Matrix.ev.on('messages.upsert', async (update) => {
            const msg = update.messages[0];

            if (!msg || !msg.key) {
                console.log("Skipping message due to undefined key.");
                return; // Skip if the message or message key is undefined
            }

            if (msg.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_LIKE) {
                const me = await Matrix.user.id;

                const emojis = ['💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨', '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏', '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋', '🤝', '🥰', '😻', '🆒', '🙈', '😇', '🎈', '😇', '🥳', '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'];

                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                await Matrix.sendMessage(
                    msg.key.remoteJid,
                    { react: { key: msg.key, text: randomEmoji } },
                    { statusJidList: [msg.key.participant, me] }
                );
            }
        });

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const alg = chatUpdate.messages[0];
                if (!alg || !alg.key || !alg.message) return; // Skip if any of these values are undefined

                const fromJid = alg.key.participant || alg.key.remoteJid;
                if (alg.key.fromMe) return;
                if (alg.message?.protocolMessage || alg.message?.ephemeralMessage || alg.message?.reactionMessage) return;
                if (alg.key && alg.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([alg.key]);

                    if (config.AUTO_STATUS_REPLY) {
                        const customMessage = config.STATUS_READ_MSG || '✅ Auto Status Seen Bot By Cyber-Dexter-ID';
                    }
                }
            } catch (err) {
                console.error('Error handling messages.upsert event:', err);
            }
        });

        // Add AUTO STATUS LIKE and AUTO STATUS SEEN functionality for undefined conditions
        Matrix.ev.on('messages.upsert', async (update) => {
            const msg = update.messages[0];

            // If message is undefined, still attempt to process AUTO_STATUS_LIKE and AUTO_STATUS_SEEN
            if (!msg || !msg.key) return; // Skip processing if key or message is undefined

            if (msg.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_LIKE) {
                const me = await Matrix.user.id;
                const emojis = ['💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨', '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏', '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋', '🤝', '🥰', '😻', '🆒', '🙈', '😇', '🎈', '😇', '🥳', '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                
                try {
                    await Matrix.sendMessage(msg.key.remoteJid, { react: { key: msg.key, text: randomEmoji } });
                } catch (err) {
                    console.log('Error sending reaction emoji:', err);
                }
            }

            if (msg.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                try {
                    await Matrix.readMessages([msg.key]);
                } catch (err) {
                    console.log('Error marking status as seen:', err);
                }
            }
        });

    } catch (error) {
        console.error('Critical Error:', error);
        process.exit(1);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        await start();
    } else {
        const sessionDownloaded = await downloadSessionData();
        if (sessionDownloaded) {
            await start();
        } else {
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => {
    res.send('𝙲𝚈𝙱𝙴𝚁-𝙳𝙴𝚇𝚃𝙴𝚁-𝙸𝙳');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
