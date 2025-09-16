class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.isProcessing = true;

        // Listen for messages from main thread
        this.port.onmessage = (event) => {
            if (event.data === 'stop') {
                this.isProcessing = false;
            }
        };
    }

    process(inputs) {
        if (!this.isProcessing) {
            return false; // This will cause the processor to be garbage collected
        }

        const input = inputs[0];
        if (!input || !input[0]) {
            return true; // Continue processing even if no input
        }

        const inputData = input[0]; // Get first channel

        // Check if there's actual audio data
        let hasAudio = false;
        for (let i = 0; i < inputData.length; i++) {
            if (Math.abs(inputData[i]) > 0.01) {
                hasAudio = true;
                break;
            }
        }

        if (hasAudio) {
            // Convert Float32Array to Int16Array (PCM)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }

            // Send PCM data to main thread
            this.port.postMessage({
                type: 'audioData',
                data: pcmData
            });
        }

        return true; // Continue processing
    }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);