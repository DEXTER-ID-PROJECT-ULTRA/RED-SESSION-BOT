import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';  // Default import
const { MessageType } = pkg;  // Destructure MessageType from the imported package

const searchCommand = async (m, client) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const [cmd, ...args] = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ') : ['', ''];

  if (cmd !== 'search') return;

  const query = args.slice(0, -1).join(' ');
  const count = parseInt(args[args.length - 1], 10) || 5;

  if (!query) {
    return await client.sendMessage(m.from, `Usage: ${prefix}search <query> <count>`, MessageType.text);
  }

  const apiUrl = `https://api.davidcyriltech.my.id/search/xvideo?text=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.result) || data.result.length === 0) {
      return await client.sendMessage(m.from, 'No results found.', MessageType.text);
    }

    for (const video of data.result.slice(0, count)) {
      const title = video.title;
      const duration = video.duration;
      const url = video.url;
      const message = video.message || 'Message not available';
      const thumbnail = video.thumbnail;

      // Download the image from the thumbnail URL
      const media = await client.downloadMediaMessage({ url: thumbnail });

      const responseMessage = `
        🎥 *${title}*
        ⏳ Duration: ${duration}
        🔗 [Watch Here](${url})
        
        Message: ${message}
      `;

      // Send the image with the caption
      await client.sendMessage(m.from, media, MessageType.image, { caption: responseMessage });
    }
  } catch (error) {
    console.error('Error occurred:', error.message);
    await client.sendMessage(m.from, 'There was an error fetching the data. Please try again later.', MessageType.text);
  }
};

export default searchCommand;
