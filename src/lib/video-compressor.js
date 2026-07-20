/**
 * Hardware-accelerated client-side video compressor using native browser APIs
 * (Canvas + Web Audio + MediaRecorder + fast playback speed).
 * Requires no external WASM binaries or demuxers.
 */
export async function compressVideo(file, options = {}) {
  const {
    targetWidth = 1920,
    targetHeight = 1080,
    targetBitrate = 5000000, // 5 Mbps - crisp 1080p, perfect for seeing player numbers
    fps = 30,
    playbackSpeed = 2.0, // Compress at 2x speed
    onProgress = () => {},
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      try {
        // Calculate aspect-ratio scale
        const originalWidth = video.videoWidth;
        const originalHeight = video.videoHeight;
        let scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
        if (scale > 1) scale = 1; // Don't upscale

        const width = Math.round((originalWidth * scale) / 2) * 2; // Must be even
        const height = Math.round((originalHeight * scale) / 2) * 2;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Setup Audio Capture
        let audioContext, mediaSource, audioDestination;
        let hasAudio = false;
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          mediaSource = audioContext.createMediaElementSource(video);
          audioDestination = audioContext.createMediaStreamDestination();
          mediaSource.connect(audioDestination);
          hasAudio = true;
        } catch (e) {
          console.warn('Could not capture audio for compression, proceeding video-only:', e.message);
        }

        // Capture Video Stream
        const videoStream = canvas.captureStream(fps);
        const combinedStream = new MediaStream();
        combinedStream.addTrack(videoStream.getVideoTracks()[0]);

        if (hasAudio && audioDestination.stream.getAudioTracks().length > 0) {
          combinedStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
        }

        // Determine supported MimeType (prefer mp4, fallback to webm)
        let mimeType = 'video/webm;codecs=vp9';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        }

        const options = { mimeType, videoBitsPerSecond: targetBitrate };
        const mediaRecorder = new MediaRecorder(combinedStream, options);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        const cleanup = () => {
          video.pause();
          URL.revokeObjectURL(video.src);
          video.remove();
          canvas.remove();
          if (audioContext) {
            audioContext.close().catch(() => {});
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: mimeType });
          cleanup();
          resolve({
            blob: compressedBlob,
            name: file.name.replace(/\.[^.]+$/, '') + '-compressed' + (mimeType.includes('mp4') ? '.mp4' : '.webm'),
            mimeType
          });
        };

        // Render loop
        let animationFrameId;
        const duration = video.duration;

        const drawFrame = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, width, height);

          // Update progress
          const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
          onProgress(progress);

          if (video.requestVideoFrameCallback) {
            video.requestVideoFrameCallback(drawFrame);
          } else {
            animationFrameId = requestAnimationFrame(drawFrame);
          }
        };

        // Start Recording
        mediaRecorder.start();
        video.playbackRate = playbackSpeed;
        video.play();

        // Start rendering frames
        if (video.requestVideoFrameCallback) {
          video.requestVideoFrameCallback(drawFrame);
        } else {
          drawFrame();
        }

        video.onended = () => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          mediaRecorder.stop();
          onProgress(100);
        };

        video.onerror = (e) => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          cleanup();
          reject(new Error('Video loading error during compression: ' + e.message));
        };

      } catch (err) {
        URL.revokeObjectURL(video.src);
        video.remove();
        reject(err);
      }
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error('Failed to load video metadata: ' + e.message));
    };
  });
}
