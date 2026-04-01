const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log("Cliente ligado");
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.type === 'start') {
            console.log("A iniciar stream para:", data.videoId);
            
            try {
                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    filter: 'videoonly',
                    quality: 'highestvideo'
                });

                ffmpegProcess = ffmpeg(stream)
                    .fps(20)
                    .size('640x360')
                    .format('image2pipe')
                    .vcodec('mjpeg')
                    .on('start', () => console.log('FFmpeg arrancou'))
                    .on('error', (err) => console.error('Erro FFmpeg:', err.message))
                    .pipe();

                ffmpegProcess.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
                });
            } catch (err) {
                console.error("Erro no YTDL:", err.message);
            }
        }
        if (data.type === 'stop' && ffmpegProcess) ffmpegProcess.kill();
    });

    ws.on('close', () => { if (ffmpegProcess) ffmpegProcess.kill(); });
});
