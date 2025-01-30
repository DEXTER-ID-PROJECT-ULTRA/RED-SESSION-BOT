import config from './config.cjs';

const Callupdate = async (json, sock) => {
   for (const id of json) {
      if (id.status === 'offer' && config.REJECT_CALL) {
         try {
            // Reject the call first
            await sock.rejectCall(id.id, id.from);

            // Image URL to be sent as caption
            const imageUrl = 'https://i.ibb.co/R7v00yc/Whats-App-Image-2025-01-20-at-08-54-38-0baab1a6.jpg';

            // Prepare the message context
            const messageContext = {
               from: id.from, // Use the caller's ID as the recipient
               message: {
                  // This is a placeholder for the original message context
                  // You may need to adjust this based on your actual message structure
                  text: 'Incoming call rejected', // Example text
                  // Add any other properties that are relevant
               }
            };

            // Sending the image with the caption
            await sock.sendMessage(messageContext.from, {
               image: { url: imageUrl },
               caption: `*📞 Auto Reject Call Mode Activated* \n\n📵 *No Calls Allowed* \n\n🛠️ *_Please note: Incoming calls are automatically rejected_* 💀`,
               contextInfo: {
                  quotedMessage: messageContext.message,
                  forwardingScore: 999,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                     newsletterJid: '120363286758767913@newsletter',
                     newsletterName: 'KING RAVI MD FORWARD',
                     serverMessageId: 143,
                  },
               },
            });
         } catch (error) {
            console.error(`Failed to reject call or send message: ${error.message}`);
         }
      }
   }
};

export default Callupdate;
