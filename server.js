const http = require('http');
const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

// Criar um servidor HTTP simples (O Render exige isto)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Servidor de Stream Ativo");
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Tesla ligado');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();

                const stream = ytdl(`https://www.youtube.com/watch?v=\${data.videoId}`, { 
                    quality: 'highestvideo',
                    filter: 'videoonly',
                    requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0...' } }
                });

                ffmpegProcess = ffmpeg(stream)
                    .fps(20)
                    .size('640x360')
                    .format('image2pipe')
                    .videoCodec('mjpeg')
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

// O Render passa a porta correta aqui
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor a correr na porta \${PORT}`);
});
