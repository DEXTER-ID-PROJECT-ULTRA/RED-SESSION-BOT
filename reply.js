import { serialize, decodeJid } from './id.js';
import path from 'path';
import fs from 'fs/promises';
import config from './config.cjs';
import { smsg } from './myfunc.cjs';
import { handleAntilink } from './antilink.js';
import { fileURLToPath } from 'url';
import os from 'os';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Excluded number for auto-replies
const EXCLUDED_NUMBER = '94757660788';

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

// Update presence
const updatePresence = async (m, sock, presenceType) => {
    try {
        const validTypes = ['unavailable', 'available', 'composing', 'recording', 'paused'];
        if (!validTypes.includes(presenceType)) {
            return m.reply(`*❌ Invalid presence type!*\nAllowed types: ${validTypes.join(', ')}`);
        }

        // Update bot presence
        await sock.sendPresenceUpdate(presenceType, m.from);
        m.reply(`*✅ Presence updated to "${presenceType}"*\n> *ᴋɪɴɢ ʀᴀᴠɪ ᴍᴅ*`);
    } catch (error) {
        console.error(`Error updating presence: ${error}`);
        m.reply(`*❌ Failed to update presence*\n> *ᴋɪɴɢ ʀᴀᴠɪ ᴍᴅ*`);
    }
};

// Presence Command
const presenceCommand = async (m, sock) => {
    const PREFIX = /^[\\/!#.]/;
    const prefixMatch = m.body.match(PREFIX);
    const prefix = prefixMatch ? prefixMatch[0] : '/';
    const [cmd, presenceType] = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ') : ['', ''];

    if (cmd === 'set-presence') {
        if (!presenceType) {
            return m.reply(`*Usage: ${prefix}set-presence <type>*\nTypes: unavailable, available, composing, recording, paused`);
        }

        await updatePresence(m, sock, presenceType);
    }
};

// Advanced Reply Command
const advancedReplyCommand = async (m, sock) => {
    const PREFIX = /^[\\/!#.]/;
    const prefixMatch = m.body.match(PREFIX);
    const prefix = prefixMatch ? prefixMatch[0] : '/';
    const [cmd, ...args] = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ') : ['', ''];

    if (!['set-reply', 'remove-reply', 'rule-reply', 'delete-rule-reply', 'broadcast', 'image-reply', 'delete-image-reply', 'video-reply', 'delete-video-reply'].includes(cmd)) return;

    if (cmd === 'set-reply') {
        if (args.length < 2) {
            return m.reply(`*Usage: ${prefix}set-reply hi|Hello ${m.pushName}, your number is ${m.sender}*\n\n> *ᴅᴇxᴛᴇʀ-ɪᴅ*`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const response = data.slice(1).join('|').trim();

        ruleReplies[trigger] = [response];
        m.reply(`*✅ Reply added*\n*Trigger: "${trigger}"*\n*Response: "${response}"*\n\n> *ᴅᴇxᴛᴇʀ-ɪᴅ*`);
    }

    if (cmd === 'rule-reply') {
        if (args.length < 2) {
            return m.reply(`*Usage: ${prefix}rule-reply <trigger|response1|response2...>*\nExample: ${prefix}rule-reply hi|Hey ${m.pushName}, here's an image for you!|Hello, your number is ${m.sender}`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const responses = data.slice(1).map(response => response.trim());

        ruleReplies[trigger] = responses;
        m.reply(`*✅ Rule Reply added*\n*Trigger: "${trigger}"*\n*Responses: ${responses.join(', ')}*\n\n> *ᴅᴇxᴛᴇʀ-ɪᴅ*`);
    }

    if (cmd === 'image-reply') {
        if (args.length < 3) {
            return m.reply(`*Usage: ${prefix}image-reply <trigger|caption|image_url>*\nExample: ${prefix}image-reply Hi|Hello, here's an image!|https://example.com/image.jpg`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const caption = data[1].trim();
        const imageUrl = data[2].trim();

        ruleReplies[trigger] = [`img ${imageUrl}|${caption}`];
        m.reply(`*✅ Image Reply added*\n*Trigger: "${trigger}"*\n*Caption: "${caption}"*\n*Image URL: ${imageUrl}\n\n> *ᴅᴇxᴛᴇʀ-ɪᴅ*`);
    }

    if (cmd === 'video-reply') {
        if (args.length < 3) {
            return m.reply(`*Usage: ${prefix}video-reply <trigger|caption|video_url>*\nExample: ${prefix}video-reply Hi|Hello, here's a video!|https://example.com/video.mp4`);
        }

        const data = args.join(' ').split('|');
        const trigger = data[0].trim().toLowerCase();
        const caption = data[1].trim();
        const videoUrl = data[2].trim();

        ruleReplies[trigger] = [`vid ${videoUrl}|${caption}`];
        m.reply(`*✅ Video Reply added*\n\n*Trigger: "${trigger}"*\n*Caption: "${caption}"*\n*Video URL: ${videoUrl}\n\n> *ᴅᴇxᴛᴇʀ-ɪᴅ*`);
    }

    // Remove commands for various replies
    const removeCommands = {
        'remove-reply': '',
        'delete-rule-reply': '',
        'delete-image-reply': 'img ',
        'delete-video-reply': 'vid ',
    };

    if (Object.keys(removeCommands).includes(cmd)) {
        if (!args.length) {
            return m.reply(`*Usage: ${prefix}${cmd} <trigger>*\n*Example: ${prefix}${cmd} hi*\n\n> *ᴄʏʙᴇʀ-ᴅᴇxᴛᴇʀ-ɪᴅ*`);
        }

        const trigger = args[0].toLowerCase();
        const typePrefix = removeCommands[cmd];

        if (ruleReplies[trigger] && (!typePrefix || ruleReplies[trigger][0].startsWith(typePrefix))) {
            delete ruleReplies[trigger];
            m.reply(`*✅ ${cmd.replace('-', ' ')} for trigger "${trigger}" has been deleted!*`);
        } else {
            m.reply(`*❌ No ${cmd.replace('-', ' ')} found for trigger: "${trigger}"*`);
        }
    }
};
// Handle incoming messages with replies
const handleIncomingMessageWithReplies = async (m, sock) => {
    // Check if sender is the excluded number
    if (m.sender === EXCLUDED_NUMBER) {
        return; // Skip auto-replies for excluded number
    }

    const message = m.body.toLowerCase();

    if (ruleReplies[message]) {
        // Set recording presence before replying
        await sock.sendPresenceUpdate('typing', m.from);

        const replies = ruleReplies[message];

        for (const reply of replies) {
            try {
                if (reply.startsWith('vid ')) {
                    const [videoUrl, caption] = reply.replace('vid ', '').split('|');
                    await sock.sendMessage(m.from, { video: { url: videoUrl }, caption: caption || ' ' });
                } else if (reply.startsWith('img ')) {
                    const [imageUrl, caption] = reply.replace('img ', '').split('|');
                    await sock.sendMessage(m.from, { image: { url: imageUrl }, caption: caption || ' ' });
                } else {
                    await m.reply(reply);
                }

                // Add delay between responses
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (e) {
                console.log(`Error sending reply: ${e}`);
            }
        }
    } else {
        // Set recording presence for any message
        await sock.sendPresenceUpdate('recording', m.from);
    }
};

// System Command
const systemCommand = async (m, sock) => {
    if (m.body === 'system') {
        const uptime = process.uptime();
        const runtime = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

        const botSpeed = `${performance.now().toFixed(2)}ms`;
        const platform = os.platform();

        const systemMessage = `*╭───────────────────────────────⊶*
*│*   *🤖 -KING RAVI-MD Bot System Information:*
*│*
*│*  *⏳ BOT RUNTIME:* ${runtime}
*│*
*│*  *⚡ SPEED:* ${botSpeed}
*│*
*│*  *🖥️ PLARFORMP:* ${platform}
*╰───────────────────────────────⊶*

*╭───────────────────⊶*
*│* *ᴋɪɴɢ ʀᴀᴠɪ ᴍᴅ*
*╰───────────────────⊶*

*╔════════════════════════╗*
*║*  *⇓━𝙾𝚆𝙽𝙴𝚁 𝙽𝚄𝙼𝙱𝙴𝚁━⇓*
*║*
*║*  *𝚆𝙷𝙰𝚃𝚂 𝙰𝙿𝙿 𝙽𝚄𝙼𝙱𝙴𝙴=94757660788*
*║*
*╚════════════════════════╝*`;

        m.reply(systemMessage);
    }
};

// Menu Command (remains the same)
const menuCommand = async (m, sock) => {
    if (m.body === 'menu-list') {
        const commands = `
╭────────────────────────╮
⚡ 𝐊𝐈𝐍𝐆 𝐑𝐀𝐕𝐈-𝐈𝐃 𝐁𝐎𝐓 𝐌𝐄𝐍𝐔⚡
╰────────────────────────╯

🪀 :𝙱𝙾𝚃 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂: 🪀
╭───────────────────────╮
│ ❶ /𝚂𝙴𝚃-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝚁|𝚁𝙴𝚂𝙿𝙾𝙽𝚂𝙴>  
│    ☛ 𝙰𝙳𝙳 𝙰 𝚁𝙴𝙿𝙻𝚈 𝙵𝙾𝚁 𝙰 𝚂𝙿𝙴𝙲𝙸𝙵𝙸𝙲 𝙼𝙴𝚂𝚂𝙰𝙶𝙴.
│
│ ❷ /𝚁𝚄𝙻𝙴-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝙴|𝚁𝙴𝚂𝙿𝙾𝙽𝚂𝙴1|𝚁𝙴𝚂𝙿𝙾𝙽𝚂𝙴2...>  
│    ☛ 𝙰𝙳𝙳 𝙼𝚄𝙻𝚃𝙸𝙿𝙻𝙴 𝚁𝙴𝚂𝙿𝙾𝙽𝚂𝙴𝚂 𝚃𝙾 𝙰 𝚃𝚁𝙸𝙶𝙶𝚁to.
│
│ ❸ /𝚁𝙴𝙼𝙾𝚅𝙴-𝚁𝙴𝙿𝙻𝚈 <𝚃𝙸𝙶𝙶𝙴𝚁>  
│    ☛ 𝚁𝙴𝙼𝙾𝚅𝙴 𝙰 𝚁𝙴𝙿𝙻𝚈 𝚃𝙸𝙶𝙶𝙴𝚁.
│
│ ❹ /𝙸𝙼𝙰𝙶𝙴-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝙴|𝙲𝙰𝙿𝚃𝙸𝙾𝙽|𝙸𝙼𝙰𝙶𝙴_𝚄𝚁𝙻>  
│    ☛ 𝚂𝙴𝙽𝙳 𝙰𝙽 𝙸𝙼𝙰𝙶𝙴 𝚁𝙴𝙿𝙻𝚈.
│
│ ❺ /𝚅𝙸𝙳𝙴𝙾-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝙴|𝙲𝙰𝙿𝚃𝙸𝙾𝙽|𝚅𝙸𝙳𝙴𝙾_𝚄𝚁𝙻>  
│    ☛ 𝚂𝙴𝙽𝙳 𝙰 𝚅𝙸𝙳𝙴𝙾 𝚁𝙴𝙿𝙻𝚈.
│
│ ❻ /𝙳𝙴𝙻𝙴𝚃𝙴-𝚁𝚄𝙻𝙴-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝚁>  
│    ☛ 𝙳𝙴𝙻𝙴𝚃𝙴 𝚁𝚄𝙻𝙴 𝚁𝙴𝙿𝙻𝙸𝙴𝚂 𝚏𝙾𝚁 𝙰 𝚃𝚁𝙸𝙶𝙶𝙴𝚁.
│ 
│ ❼ /𝙳𝙴𝙻𝙴𝚃𝙴-𝙸𝙼𝙰𝙶𝙴-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝚁>  
│    ☛ 𝚁𝙴𝙼𝙾𝚅𝙴 𝙰𝙽 𝙸𝙼𝙰𝙶𝙴 𝚃𝙴𝙿𝙻𝚈 𝙶𝙾𝚁 𝙰 𝚃𝚁𝙸𝙶𝙶𝙴𝚁.  
│    
│
│ ❽ /𝙳𝙴𝙻𝙴𝚃𝙴-𝚅𝙸𝙳𝙴𝙾-𝚁𝙴𝙿𝙻𝚈 <𝚃𝚁𝙸𝙶𝙶𝙴𝚁>  
│    ☛ 𝚁𝙴𝙼𝙾𝚅𝙴 𝙰 𝚅𝙸𝙳𝙴𝙾 𝚁𝙴𝙿𝙻𝚈 𝙵𝙾𝚁 𝙰 𝚃𝚁𝙸𝙶𝙶𝙴𝚁.  
│    
│
│ ❾ /𝚂𝙴𝚁-𝙿𝚁𝙴𝚂𝙴𝙽𝙲𝙴 <𝚃𝚈𝙴𝙿>
│    ☛ 𝚄𝙿𝙳𝙰𝚃𝙴 𝙱𝙾𝚃 𝙿𝚁𝙴𝚂𝙴𝙽𝙲𝙴 (𝙴.𝙶., 𝙰𝚅𝙰𝙸𝙻𝙰𝙱𝙻𝙴, 𝙲𝙾𝙼𝙿𝙾𝚂𝙸𝙽𝙳).
│    
╰───────────────────────╯

🛠 :𝚂𝚈𝚂𝚃𝙴𝙼 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂: 🛠
╭───────────────────────╮
│  ❶ 𝚂𝚈𝚂𝚃𝙴𝙼  
│      ☛ 𝚅𝙸𝙴𝚆 𝚂𝚈𝚂𝚃𝙴𝙼 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚃𝙸𝙾𝙽 (𝚄𝙿𝚃𝙸𝙼𝙴, 𝚂𝙿𝙴𝙴𝙳, 𝙰𝙽𝙳
 |   𝙿𝙻𝙰𝚃𝙵𝙾𝙴𝙼).
╰───────────────────────╯

⚔ :𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚃𝙸𝙾𝙽: ⚔
╭───────────────────────╮
│ This bot is powered by KING RAVI-ID Bot Engine,  
│ created by Cyber Dexter. For support, contact the admin.  
│ ➤ KING RAVI-ID   
╰───────────────────────╯
`;

        const menuImageUrl = '"https://i.ibb.co/3cvBCzS/pexels-towfiqu-barbhuiya-3440682-8541751.jpg';

        await sock.sendMessage(m.from, {
            image: { url: menuImageUrl },
            caption: commands,
        });
    }
};


// Handler function for processing chat updates
const Handler = async (chatUpdate, sock, logger) => {
    try {
        if (chatUpdate.type !== 'notify') return;

        const m = serialize(JSON.parse(JSON.stringify(chatUpdate.messages[0])), sock, logger);
        if (!m.message) return;

        // Handle advanced reply commands
        await advancedReplyCommand(m, sock);

        // Handle incoming messages with replies
        await handleIncomingMessageWithReplies(m, sock);

        // Handle system command
        await systemCommand(m, sock);

        // Handle menu command
        await menuCommand(m, sock);

        // Handle presence command
        await presenceCommand(m, sock);

    } catch (e) {
        console.log(e);
    }
};

export default Handler;
