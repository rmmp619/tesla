const WebSocket = require('ws');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();

                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    quality: 'highestvideo',
                    filter: 'videoonly' 
                });

                ffmpegProcess = ffmpeg(stream)
                    .fps(24)
                    .size('640x360')
                    .format('image2pipe')
                    .vcodec('mjpeg')
                    .on('error', (err) => console.log('FFmpeg:', err.message))
                    .pipe();

                ffmpegProcess.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
                });
            }
            if (data.type === 'stop' && ffmpegProcess) ffmpegProcess.kill();
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => { if (ffmpegProcess) ffmpegProcess.kill(); });
});
console.log(`Servidor na porta ${PORT}`);
