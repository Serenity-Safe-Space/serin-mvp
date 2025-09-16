class PCMWorkletProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];

        if (output && output[0]) {
            output[0].fill(0); // prevent routing microphone input to output path
        }

        if (!input || input.length === 0) {
            return true;
        }

        const channelData = input[0];
        if (!channelData || channelData.length === 0) {
            return true;
        }

        const pcmBuffer = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i] || 0));
            pcmBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        this.port.postMessage(pcmBuffer, [pcmBuffer.buffer]);
        return true;
    }
}

registerProcessor('pcm-processor', PCMWorkletProcessor);
