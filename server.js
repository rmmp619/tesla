const http = require('http');
const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

// Criar o servidor HTTP que o Render exige
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Servidor CarTube Online");
});

// Ligar o WebSocket ao servidor HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Cliente ligado');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();
                
                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    quality: 'highestvideo', filter: 'videoonly' 
                });

                ffmpegProcess = ffmpeg(stream)
                    .fps(20).size('640x360').format('image2pipe').videoCodec('mjpeg')
                    .on('error', (e) => console.log('FFmpeg:', e.message))
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Porta: ${PORT}`));
