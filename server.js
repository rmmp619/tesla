const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Servidor de Stream ativo na porta ${PORT}`);

wss.on('connection', (ws) => {
    console.log('Tesla ligado ao servidor');
    let ffmpegProcess = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'start' && data.videoId) {
                console.log('A processar vídeo:', data.videoId);
                if (ffmpegProcess) ffmpegProcess.kill();

                // Tenta enganar o YouTube com um User-Agent de browser real
                const stream = ytdl(`https://www.youtube.com/watch?v=${data.videoId}`, { 
                    quality: 'highestvideo',
                    filter: 'videoonly',
                    requestOptions: {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    }
                });

                // CORREÇÃO: .videoCodec('mjpeg') em vez de .vcodec()
                ffmpegProcess = ffmpeg(stream)
                    .fps(24)
                    .size('640x360')
                    .format('image2pipe')
                    .videoCodec('mjpeg') 
                    .on('error', (err) => {
                        console.log('FFmpeg parou ou vídeo bloqueado:', err.message);
                    })
                    .pipe();

                ffmpegProcess.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(chunk);
                    }
                });
            }

            if (data.type === 'stop' && ffmpegProcess) {
                ffmpegProcess.kill();
            }
        } catch (e) {
            console.error("Erro no processamento:", e.message);
        }
    });

    ws.on('close', () => {
        if (ffmpegProcess) ffmpegProcess.kill();
    });
});
