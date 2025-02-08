import fetch from 'node-fetch';

const pinterestdl = async (m, bot) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd === 'search') {
    const args = m.body.slice(prefix.length + cmd.length).trim().split(' ');
    const searchQuery = args.slice(0, -1).join(' ');
    const count = parseInt(args[args.length - 1], 10) || 20;  // Default count is 20 if not provided

    if (!searchQuery) {
      return m.reply(`*Please provide a search query*\n\n\n\nExample: ${prefix}search new 20`);
    }

    const apiUrl = `https://api.davidcyriltech.my.id/search/xvideo?text=${encodeURIComponent(searchQuery)}`;

    try {
      m.reply('🚀 *Loading trending videos...* Please wait...');
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.success || data.status !== 200) {
        throw new Error('Failed to fetch search results.');
      }

      const videos = data.result; // Assuming this returns an array of video objects

      // Limit the number of videos to the `count` specified in the command
      const limitedVideos = videos.slice(0, count);

      // Send the videos
      for (const video of limitedVideos) {
        const { title, duration, thumbnail, url } = video;

        const message = {
          image: { url: thumbnail },
          caption: `*🎨 Title:* ${title}\n*⏳ Duration:* ${duration}\n*🔗 URL:* ${url}`
        };

        await bot.sendMessage(m.from, message, { quoted: m });
      }
    } catch (error) {
      console.error('Error fetching search data:', error);
      m.reply('*❌ Error fetching trending videos. Please try again later.*');
    }
  }
};

export default pinterestdl;
