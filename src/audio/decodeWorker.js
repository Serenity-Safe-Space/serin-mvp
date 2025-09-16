const DEFAULT_PLAYBACK_SAMPLE_RATE = 24000;

const parseSampleRateFromMime = (mimeType) => {
    if (!mimeType) {
        return DEFAULT_PLAYBACK_SAMPLE_RATE;
    }

    const match = mimeType.match(/rate=(\d+)/i);
    return match ? parseInt(match[1], 10) : DEFAULT_PLAYBACK_SAMPLE_RATE;
};

self.onmessage = (event) => {
    const { id, base64AudioData, mimeType } = event.data || {};

    try {
        if (!base64AudioData) {
            self.postMessage({ id, audioBuffer: null, sampleRate: parseSampleRateFromMime(mimeType) });
            return;
        }

        const binaryString = atob(base64AudioData);
        const uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }

        const sampleRate = parseSampleRateFromMime(mimeType);
        const sampleCount = uint8Array.length / 2;
        const floatChannelData = new Float32Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
            const sample = (uint8Array[i * 2] | (uint8Array[i * 2 + 1] << 8));
            const signedSample = sample > 32767 ? sample - 65536 : sample;
            floatChannelData[i] = signedSample / 32768.0;
        }

        self.postMessage({ id, audioBuffer: floatChannelData.buffer, sampleRate }, [floatChannelData.buffer]);
    } catch (error) {
        self.postMessage({ id, error: error.message || 'Unknown audio decode error' });
    }
};
