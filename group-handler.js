import moment from 'moment-timezone';
import config from './config.cjs';

export default async function GroupParticipants(sock, { id, participants, action }) {
   try {
      // Fetch group metadata
      let metadata;
      try {
         metadata = await sock.groupMetadata(id);
      } catch (error) {
         console.error("Error fetching group metadata:", error);
         return; // Return early if metadata fetching fails
      }

      // Loop through each participant
      for (const jid of participants) {
         // Fetch participant's profile picture
         let profile;
         try {
            profile = await sock.profilePictureUrl(jid, "image");
         } catch {
            profile = "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu";
         }

         // Check the action and send appropriate message
         if (action === "add" && config.WELCOME) {
            const userName = jid.split("@")[0];
            const joinTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
            const joinDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
            const membersCount = metadata.participants.length;

            // Welcome message with video
            const welcomeCaption = `*🎉✨  Hello @${userName}! Welcome to ${metadata.subject}*.\n\n👥  *You are the ${membersCount}th member*\n\n🕒  *Joined at: ${joinTime} on ${joinDate}*\n\n\n🎊 *Enjoy your stay and feel free to chat with everyone 📍*`;
            sock.sendMessage(id, {
               video: { url: 'https://github.com/rcd-git-hub-official/STATUS-COMMAND-/raw/refs/heads/main/668a0861b45dc061f88d7eeb3f4356e9.mp4' },
               caption: welcomeCaption,
               contextInfo: {
                  mentionedJid: [jid],
                  externalAdReply: {
                     title: `𝚆𝙴𝙻𝙲𝙾𝙼𝙴 𝚃𝙾 𝙼𝚈 𝙶𝚁𝙾𝚄𝙿𝙴 ✨`,
                     mediaType: 1,
                     previewType: 0,
                     renderLargerThumbnail: true,
                     thumbnailUrl: profile,
                     sourceUrl: 'https://youtube.com/@lucifermd_dz?si=Ysuhntaxpei7EV_v'
                  }
               }
            }).catch(error => console.error("Error sending welcome message:", error));
         } else if (action === "remove" && config.WELCOME) {
            const userName = jid.split('@')[0];
            const leaveTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
            const leaveDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
            const membersCount = metadata.participants.length;

            // Goodbye message with video
            const goodbyeCaption = `😢👋 *Goodbye @${userName} from ${metadata.subject}*.\n\n📉  *We are now ${membersCount} members in the group* 📍\n\n🕒 *Left at: ${leaveTime} on ${leaveDate}* 📍\n\n\n📍 *BYE MEMBERS 👍😂* `;
            sock.sendMessage(id, {
               video: { url: 'https://files.catbox.moe/z2f9gt.jpg' },
               caption: goodbyeCaption,
               contextInfo: {
                  mentionedJid: [jid],
                  externalAdReply: {
                     title: `GOOD BYE PLEASE DONT JOIN AGAIN 😂👍`,
                     mediaType: 1,
                     previewType: 0,
                     renderLargerThumbnail: true,
                     thumbnailUrl: profile,
                     sourceUrl: 'https://youtube.com/@lucifermd_dz?si=Ysuhntaxpei7EV_v'
                  }
               }
            }).catch(error => console.error("Error sending goodbye message:", error));
         }
      }
   } catch (e) {
      console.error("Unexpected error in GroupParticipants function:", e);
   }
}
