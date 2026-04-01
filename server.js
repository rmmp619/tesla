const http = require('http');
const WebSocket = require('ws');
const stream = ytdl(videoUrl, { 
    quality: 'highestvideo',
    filter: 'videoonly',
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        }
    }
});

// 1. CRIAR SERVIDOR HTTP (Obrigatório para o Render aceitar a ligação)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Servidor CarTube Ativo');
});

// 2. ACOPLAR O WEBSOCKET AO SERVIDOR HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Tesla conectado!');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();

                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    quality: 'highestvideo',
                    filter: 'videoonly',
                    requestOptions: {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        }
                    }
                });

                ffmpegProcess = ffmpeg(stream)
                    .fps(20)
                    .size('640x360')
                    .format('image2pipe')
                    .videoCodec('mjpeg')
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

// 3. ESCUTAR NA PORTA DO RENDER
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});
