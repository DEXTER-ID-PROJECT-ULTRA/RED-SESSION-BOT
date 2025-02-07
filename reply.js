import { serialize, decodeJid } from './id.js';
import path from 'path';
import fs from 'fs/promises';
import config from './config.cjs';
import { smsg } from './myfunc.cjs';
import { handleAntilink } from './antilink.js';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get group admins
export const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
        if (i.admin === "superadmin" || i.admin === "admin") {
            admins.push(i.id);
        }
    }
    return admins || [];
};

// Store for rule replies (including timed responses)
let ruleReplies = {};

// Advanced reply command
const advancedReplyCommand = async (m, sock) => {
    const PREFIX = /^[\\/!#.]/;
    const prefixMatch = m.body.match(PREFIX);
    const prefix = prefixMatch ? prefixMatch[0] : '/';
    const [cmd, ...args] = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ') : ['', ''];

    if (cmd !== 'set-reply' && cmd !== 'remove-reply' && cmd !== 'rule-reply') return;

    // Handle /set-reply command to add advanced replies
    if (cmd === 'set-reply') {
        if (args.length < 2) {
            return m.reply(`*Usage: ${prefix}set-reply Hi|Hello*\n\n> *ʀᴄᴅ ᴍᴅ*`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const response = data.slice(1).join('|').trim();

        // Store the reply in the replies object with the trigger
        replies[trigger] = response;
        m.reply(`*✅ Reply added*\n*Trigger: "${trigger}"*\n*Response: "${response}"*\n\n\n> *ʀᴄᴅ ᴍᴅ*`);
    }

    // Handle /deletereply command to delete specific replies
    if (cmd === 'remove-reply') {
        if (!args.length) {
            return m.reply(`*Usage: ${prefix}remove-reply <trigger>*\n*Example: ${prefix}remove-reply hi*\n\n\n> *ʀᴄᴅ ᴍᴅ*`);
        }

        const trigger = args[0].toLowerCase();

        // Check if the reply exists and delete it
        if (replies[trigger]) {
            delete replies[trigger];
            m.reply(`*✅ Reply for trigger "${trigger}" has been deleted ❔*`);
        } else {
            m.reply(`*❌ No reply found for trigger: "${trigger}" ❔*`);
        }
    }

    // Handle /rule-reply command to add multiple replies with time delays
    if (cmd === 'rule-reply') {
        if (!args.length) {
            return m.reply(`*Usage: ${prefix}rule-reply <trigger>|<response1>|<response2>|<response3>*\n\n\n> *ʀᴄᴅ ᴍᴅ*`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const responses = data.slice(1).map(response => response.trim()).filter(response => response);

        // Store the rule-based replies
        ruleReplies[trigger] = responses;
        m.reply(`*✅ Rule-reply added!*\n*Trigger: "${trigger}"*\n*Responses: ${responses.join(', ')}*\n\n\n> *ʀᴄᴅ ᴍᴅ*`);
    }
};

// Handle incoming messages and use stored replies
const handleIncomingMessage = async (m, sock) => {
    const message = m.body.toLowerCase();

    // If the reply exists in the rule-replies store, handle the timed responses
    if (ruleReplies[message]) {
        const responses = ruleReplies[message];
        let delay = 0; // Initialize delay

        // Send each message in sequence with a delay between them
        for (const response of responses) {
            await sock.sendMessage(m.from, { text: response });

            // Set a fixed delay between messages (in seconds)
            delay += 5; // For example, 5 seconds delay between each message
            await new Promise(resolve => setTimeout(resolve, delay * 1000)); // Convert seconds to milliseconds
        }
    }
};

// Handler function for processing chat updates
const Handler = async (chatUpdate, sock, logger) => {
    try {
        if (chatUpdate.type !== 'notify') return;

        const m = serialize(JSON.parse(JSON.stringify(chatUpdate.messages[0])), sock, logger);
        if (!m.message) return;

        const participants = m.isGroup ? await sock.groupMetadata(m.from).then(metadata => metadata.participants) : [];
        const groupAdmins = m.isGroup ? getGroupAdmins(participants) : [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmins = m.isGroup ? groupAdmins.includes(botId) : false;
        const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false;

        const botNumber = await sock.decodeJid(sock.user.id);
        const ownerNumbers = [
            config.OWNER_NUMBER + '@s.whatsapp.net',
            '94753574803@s.whatsapp.net',
            '94785274495@s.whatsapp.net',
            '94757660788@s.whatsapp.net'
        ];
        let isCreator = ownerNumbers.includes(m.sender) || m.sender === botNumber;

        if (!sock.public) {
            if (!isCreator) {
                return;
            }
        }

        await handleAntilink(m, sock, logger, isBotAdmins, isAdmins, isCreator);

        // Handle the advanced reply command
        await advancedReplyCommand(m, sock);

        // Handle incoming messages
        await handleIncomingMessage(m, sock);

        // Continue processing plugins
        const pluginDir = path.join(__dirname, '..', 'command');
        const pluginFiles = await fs.readdir(pluginDir);

        for (const file of pluginFiles) {
            if (file.endsWith('.js')) {
                const pluginPath = path.join(pluginDir, file);
                try {
                    const pluginModule = await import(`file://${pluginPath}`);
                    const loadPlugins = pluginModule.default;
                    await loadPlugins(m, sock);
                } catch (err) {
                    console.error(`Failed to load plugin: ${pluginPath}`, err);
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
};

export default Handler;
