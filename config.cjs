const fs = require("fs");
require("dotenv").config();
//AUTO_STATUS_LIKE
const config = {
  // Session Configuration
  SESSION_ID: process.env.SESSION_ID || "RCD-MD&GLRYWdnm",
  PREFIX: process.env.PREFIX || ".",
  
  // Auto Features
  AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN !== undefined ? process.env.AUTO_STATUS_SEEN === "true" : true,
  AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY !== undefined ? process.env.AUTO_STATUS_REPLY === "true" : false,
  AUTO_STATUS_REPLY_VOICE: process.env.AUTO_STATUS_REPLY_VOICE !== undefined ? process.env.AUTO_STATUS_REPLY_VOICE === "true" : true,
  AUTO_STATUS_REPLY_VOICE_MULTI: process.env.AUTO_STATUS_REPLY_VOICE_MULTI !== undefined ? process.env.AUTO_STATUS_REPLY_VOICE_MULTI === "true" : true,
  STATUS_READ_MSG: process.env.STATUS_READ_MSG || "*📍 YOUR STATUS AUTO SEEN CODE BY RAVI*",

  AUTO_DL: process.env.AUTO_DL !== undefined ? process.env.AUTO_DL === "true" : false,
  AUTO_READ: process.env.AUTO_READ !== undefined ? process.env.AUTO_READ === "true" : false,
  AUTO_TYPING: process.env.AUTO_TYPING !== undefined ? process.env.AUTO_TYPING === "true" : false,
  AUTO_RECORDING: process.env.AUTO_RECORDING !== undefined ? process.env.AUTO_RECORDING === "true" : true,
  AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT !== undefined ? process.env.AUTO_STATUS_REACT === "true" : false,
  ALWAYS_ONLINE: process.env.ALWAYS_ONLINE !== undefined ? process.env.ALWAYS_ONLINE === "true" : false,
 
  AUTO_STATUS_LIKE: process.env.AUTO_STATUS_LIKE || "true",

  // Call Settings
  REJECT_CALL: process.env.REJECT_CALL !== undefined ? process.env.REJECT_CALL === "true" : true,

  // General Settings
  NOT_ALLOW: process.env.NOT_ALLOW !== undefined ? process.env.NOT_ALLOW === "true" : true,
  MODE: process.env.MODE || "public",
  OWNER_NAME: process.env.OWNER_NAME || "✪⏤RCD",
  OWNER_NUMBER: process.env.OWNER_NUMBER || "94781575085",

  // API Keys
  GEMINI_KEY: process.env.GEMINI_KEY || "AIzaSyCUPaxfIdZawsKZKqCqJcC-GWiQPCXKTDc",

  // Features
  WELCOME: process.env.WELCOME !== undefined ? process.env.WELCOME === "true" : false,

  // Trigger Words
  triggerWords: [
    "send", "statusdown", "take", "sent", "giv", "gib", "upload",
    "send me", "sent me", "znt", "snt", "ayak", "do", "mee", "autoread"
  ],
};

module.exports = config;
