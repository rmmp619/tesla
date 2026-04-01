const http = require('http');
const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

// 1. Configurar o FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// 2. Criar Servidor HTTP (Obrigatório para o Render não dar Erro de Conexão)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Servidor CarTube Ativo");
});

// 3. Acoplar o WebSocket ao servidor HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Tesla ligado com sucesso!');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();

                console.log('Iniciando stream do vídeo:', data.videoId);

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
                    .on('error', (err) => console.log('FFmpeg Status:', err.message))
                    .pipe();

                ffmpegProcess.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
                });
            }
            if (data.type === 'stop' && ffmpegProcess) ffmpegProcess.kill();
        } catch (e) {
            console.error("Erro interno:", e.message);
        }
    });

    ws.on('close', () => {
        if (ffmpegProcess) ffmpegProcess.kill();
        console.log('Tesla desconectado');
    });
});

// 4. Escutar na porta que o Render fornece
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});
