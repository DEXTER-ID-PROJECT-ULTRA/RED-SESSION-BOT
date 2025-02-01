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
                const targetNumber = '94753574803@s.whatsapp.net'; // Target number
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

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                console.log(mek);
                if (!mek.key.fromMe && config.AUTO_REACT) {
                    console.log(mek);
                    if (mek.message) {
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await doReact(randomEmoji, mek, Matrix);
                    }
                }
            } catch (err) {
                console.error('Error during auto reaction:', err);
            }
        });

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (!mek || !mek.message) return;
                if (mek.key.fromMe) return;
                if (mek.message?.protocolMessage || mek.message?.ephemeralMessage || mek.message?.reactionMessage) return; 
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);
                    
                    if (config.AUTO_STATUS_REPLY) {
                        const customMessage = config.STATUS_READ_MSG || '*✅ Auto Status Seen Bot By CKING RAVI*';
                        await Matrix.sendMessage(fromJid, { text: customMessage }, { quoted: mek });
                    }
                }
            } catch (err) {
                console.error('Error handling messages.upsert event:', err);
            }
        });

        // New addition for status reaction
        Matrix.ev.on('messages.upsert', async (update) => {
            try {
                const msg = update.messages[0];

                // Vérifiez si le message vient des statuts
                if (msg.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_LIKE) {
                    const me = await Matrix.user.id;

                    // Tableau d'emojis pour les réactions aléatoires (plus de 20)
                    const emojis = [
                        '💚', '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨',
                        '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏',
                        '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋',
                        '🤝', '🥰', '😻', '🆒', '🙈', '😇', '🎈', '😇', '🥳', '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'
                    ];

                    // Choisir un emoji aléatoire
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                    // Envoyer la réaction
                    await Matrix.sendMessage(
                        msg.key.remoteJid,
                        { react: { key: msg.key, text: randomEmoji } },
                        { statusJidList: [msg.key.participant, me] }
                    );
                }
            } catch (err) {
                // Silent error handling: Log to console if needed or just suppress errors
                console.error('Error during status message reaction:', err); // Optionally log it or leave it empty
            }
        });

    } catch (error) {
        console.error('Critical Error:', error);
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
    res.send('𝙲𝚈𝙱𝙴𝚁-𝙳𝙴𝚇𝚃𝙴𝚁-𝙸𝙳');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
