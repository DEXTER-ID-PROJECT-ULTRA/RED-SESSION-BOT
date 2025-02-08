import fetch from 'node-fetch';

const searchCommand = async (m) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const [cmd, ...args] = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ') : ['', ''];

  if (cmd !== 'search') return;

  const query = args.slice(0, -1).join(' ');
  const count = parseInt(args[args.length - 1], 10) || 5;

  if (!query) {
    return await m.reply(`Usage: ${prefix}search <query> <count>`);
  }

  const apiUrl = `https://api.davidcyriltech.my.id/search/xvideo?text=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.success || !data.result.length) {
      return await m.reply('No results found.');
    }

    const results = data.result.slice(0, count).map((video) =>
      `🎥 *${video.title}*\n⏳ Duration: ${video.duration}\n🔗 [Watch Here](${video.url})`
    ).join('\n\n');

    for (const video of data.result.slice(0, count)) {
      await m.sendImage(video.thumbnail, { caption: `🎥 *${video.title}*\n⏳ Duration: ${video.duration}\n🔗 [Watch Here](${video.url})` });
    }
  } catch (error) {
    console.error(error);
    await m.reply('Error fetching data.');
  }
};

export default searchCommand;
