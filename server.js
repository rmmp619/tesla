const WebSocket = require('ws');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

// Configura o caminho do FFmpeg automaticamente
ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 8080;
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

                const videoUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
                
                // Obtém o stream do YouTube
                const stream = ytdl(videoUrl, { 
                    quality: 'highestvideo',
                    filter: 'videoonly' 
                });

                // Converte para MJPEG (Sequência de imagens para o Canvas)
                ffmpegProcess = ffmpeg(stream)
                    .fps(24)
                    .size('640x360')
                    .format('image2pipe')
                    .vcodec('mjpeg')
                    .on('error', (err) => console.log('FFmpeg Status:', err.message))
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
            console.error("Erro no processamento:", e);
        }
    });

    ws.on('close', () => {
        if (ffmpegProcess) ffmpegProcess.kill();
        console.log('Cliente desligou');
    });
});
