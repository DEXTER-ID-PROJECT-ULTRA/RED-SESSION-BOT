import config from './config.cjs';

const Callupdate = async (json, sock) => {
   for (const id of json) {
      if (id.status === 'offer' && config.REJECT_CALL) {
         try {
            // Reject the call first
            await sock.rejectCall(id.id, id.from);

            // Image URL to be sent as caption
            const imageUrl = 'https://i.ibb.co/YBPtB5BB/2c20f2e5bfc375e0dff4568d2659617f.jpg';

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
                     newsletterName: 'DEXTER CALL WARNING  FORWARD YOU',
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
