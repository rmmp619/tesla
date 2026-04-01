const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('Tesla ligado ao servidor');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'start' && data.videoId) {
                if (ffmpegProcess) ffmpegProcess.kill();

                console.log('A tentar processar:', data.videoId);

                // Configuração para evitar deteção de bot
                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    quality: 'highestvideo',
                    filter: 'videoonly',
                    requestOptions: {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Connection': 'keep-alive'
                        }
                    }
                });

                // CORREÇÃO: .videoCodec('mjpeg') e tratamento de erro
                ffmpegProcess = ffmpeg(stream)
                    .fps(20)
                    .size('640x360')
                    .format('image2pipe')
                    .videoCodec('mjpeg') 
                    .on('error', (err) => {
                        console.log('Erro no FFmpeg:', err.message);
                    })
                    .pipe();

                ffmpegProcess.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
                });
            }
            if (data.type === 'stop' && ffmpegProcess) ffmpegProcess.kill();
        } catch (e) { console.error("Erro processamento:", e.message); }
    });

    ws.on('close', () => { if (ffmpegProcess) ffmpegProcess.kill(); });
});
console.log(`Servidor ativo na porta ${PORT}`);
