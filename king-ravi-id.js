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
import axios from 'axios';
import moment from 'moment-timezone';
import config from './config.cjs';
import pkg from './auto.cjs';

const { emojis, doReact } = pkg;

const app = express();
const sessionName = "session";
const orange = chalk.bold.hex("#FFA500");
const lime = chalk.bold.hex("#32CD32");
let useQR = false;
const PORT = process.env.PORT || 3000;

const MAIN_LOGGER = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` });
const logger = MAIN_LOGGER.child({});
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

async function downloadSessionData() {
    if (!config.SESSION_ID) {
        logger.error('❌ Please set the SESSION_ID in the environment variables!');
        return false;
    }
    
    try {
        const decodedSession = Buffer.from(config.SESSION_ID, 'base64').toString('utf-8');
        await fs.promises.writeFile(credsPath, decodedSession);
        return true;
    } catch (error) {
        logger.error('❌ Failed to write session data:', error);
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: useQR,
            browser: ["Cyber-Dexter-Id", "Safari", "3.3"],
            auth: state,
            getMessage: async (key) => ({ conversation: "Cyber-Dexter-Id WhatsApp user bot" })
        });

        Matrix.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                start();
            } else if (connection === 'open') {
                const targetNumber = '94789958225@s.whatsapp.net';
                const autoMessage = '✅ Bot Successfully Connected! 🚀\n🔥 Cyber-Dexter-ID Bot is now online.';
                try {
                    await Matrix.sendMessage(targetNumber, { text: autoMessage });
                } catch (err) {
                    logger.error('❌ Failed to send auto message:', err);
                }
            }
        });

        Matrix.ev.on('creds.update', saveCreds);

        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.message) return;
                if (mek.key.fromMe) return;

                // Auto React Feature
                if (config.AUTO_REACT) {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await doReact(randomEmoji, mek, Matrix);
                }

                // Auto Status Seen & Reply Feature
                if (mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);
                    if (config.AUTO_STATUS_REPLY) {
                        const replyMsg = config.STATUS_READ_MSG || '*✅ Auto Status Seen Bot By CKING RAVI*';
                        await Matrix.sendMessage(mek.key.participant || mek.key.remoteJid, { text: replyMsg }, { quoted: mek });
                    }
                }

                await Handler(chatUpdate, Matrix, logger);
            } catch (err) {
                logger.error('❌ Error processing messages.upsert:', err);
            }
        });

        Matrix.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, Matrix, logger));
        Matrix.ev.on("call", async (json) => await Callupdate(json, Matrix));
        Matrix.ev.on("group-participants.update", async (messag) => await GroupUpdate(Matrix, messag));
        
        Matrix.public = config.MODE === "public";
    } catch (error) {
        logger.error('❌ Critical Error:', error);
        process.exit(1);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        logger.info("🔒 Session file found, proceeding without QR code.");
        await start();
    } else {
        const sessionDownloaded = await downloadSessionData();
        if (sessionDownloaded) {
            logger.info("🔒 Session downloaded, starting bot.");
            await start();
        } else {
            logger.info("❌ No session found. Printing QR code for authentication.");
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => res.send('𝙲𝚈𝙱𝙴𝚁-𝙳𝙴𝚇𝚃𝙴𝚁-𝙸𝙳'));

app.listen(PORT, () => logger.info(`🚀 Server is running on port ${PORT}`));
