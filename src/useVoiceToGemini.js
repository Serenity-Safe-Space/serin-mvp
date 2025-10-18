import { useState, useRef, useEffect } from 'react';
import { getSerinVoiceInstruction } from './utils/serinPrompt';

const VAD_MIN_SPEECH_DURATION_MS = 250;
const VAD_MAX_SILENCE_DURATION_MS = 1000;
const VAD_RMS_START_THRESHOLD = 0.012;
const VAD_RMS_CONTINUE_THRESHOLD = 0.006;
const PLAYBACK_START_DELAY = 0.05;
const CAPTURE_SAMPLE_RATE = 16000;
const DEFAULT_PLAYBACK_SAMPLE_RATE = 24000;

const convertInt16ToBase64 = (pcmData) => {
    if (!pcmData || pcmData.length === 0) {
        return '';
    }

    const byteView = new Uint8Array(pcmData.buffer);
    const chunkSize = 0x8000;
    let binaryString = '';

    for (let i = 0; i < byteView.length; i += chunkSize) {
        const chunk = byteView.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binaryString);
};

const parseSampleRateFromMime = (mimeType) => {
    if (!mimeType) {
        return DEFAULT_PLAYBACK_SAMPLE_RATE;
    }

    const match = mimeType.match(/rate=(\d+)/i);
    return match ? parseInt(match[1], 10) : DEFAULT_PLAYBACK_SAMPLE_RATE;
};

const computeRms = (pcmData) => {
    if (!pcmData || pcmData.length === 0) {
        return 0;
    }

    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
        const normalized = pcmData[i] / 32768;
        sum += normalized * normalized;
    }

    return Math.sqrt(sum / pcmData.length);
};

export const useVoiceToGemini = (options = {}) => {
    const { onConversationUpdate } = options;
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    const mediaRecorderRef = useRef(null);
    const socketRef = useRef(null);
    const captureContextRef = useRef(null);
    const playbackContextRef = useRef(null);
    const playbackGainRef = useRef(null);
    const streamRef = useRef(null);
    const decodeWorkerRef = useRef(null);
    const decodeRequestIdRef = useRef(0);
    const playbackStateRef = useRef({ nextStartTime: 0, activeSources: 0 });
    const vadStateRef = useRef({
        isSpeech: false,
        speechStartTs: 0,
        lastSpeechTs: 0,
        pendingChunks: []
    });
    const audioWorkletModuleLoadedRef = useRef(false);
    const conversationTextBufferRef = useRef({
        user: { text: '', emittedAt: 0 },
        assistant: { text: '', emittedAt: 0 }
    });

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (captureContextRef.current) {
                captureContextRef.current.close();
                captureContextRef.current = null;
                audioWorkletModuleLoadedRef.current = false;
            }
            if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
                playbackGainRef.current = null;
            }
            if (decodeWorkerRef.current) {
                decodeWorkerRef.current.terminate();
                decodeWorkerRef.current = null;
            }
            playbackStateRef.current = { nextStartTime: 0, activeSources: 0 };
            vadStateRef.current = {
                isSpeech: false,
                speechStartTs: 0,
                lastSpeechTs: 0,
                pendingChunks: []
            };
            resetConversationBuffers();
        };
    }, []);

    const resetVadState = () => {
        vadStateRef.current = {
            isSpeech: false,
            speechStartTs: 0,
            lastSpeechTs: 0,
            pendingChunks: []
        };
    };

    const resetConversationBuffers = () => {
        conversationTextBufferRef.current = {
            user: { text: '', emittedAt: 0 },
            assistant: { text: '', emittedAt: 0 }
        };
    };

    const emitConversationUpdate = (role, text) => {
        if (typeof onConversationUpdate !== 'function') {
            return;
        }

        const normalized = typeof text === 'string' ? text.trim() : '';

        if (!normalized) {
            return;
        }

        onConversationUpdate({ role, content: normalized });
    };

    const updateConversationBuffer = (role, text) => {
        if (!text) {
            return;
        }

        const normalized = text.trim();

        if (!normalized) {
            return;
        }

        const now = Date.now();
        const existing = conversationTextBufferRef.current[role] || { text: '', emittedAt: 0 };

        if (existing.text === normalized && now - existing.emittedAt < 750) {
            return;
        }

        conversationTextBufferRef.current[role] = { text: normalized, emittedAt: now };
        emitConversationUpdate(role, normalized);
    };

    const coalesceTextFromParts = (parts) => {
        if (!Array.isArray(parts)) {
            return '';
        }

        return parts
            .map((part) => {
                if (typeof part?.text === 'string') {
                    return part.text;
                }

                const inlineData = part?.inlineData;
                if (inlineData?.mimeType?.startsWith('text/') && typeof inlineData?.data === 'string') {
                    try {
                        return atob(inlineData.data);
                    } catch (error) {
                        console.warn('Failed to decode inline text data:', error);
                        return '';
                    }
                }

                return '';
            })
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const handleTextualSegments = (response) => {
        if (!response) {
            return;
        }

        if (response.realtimeResponse?.parts) {
            const assistantText = coalesceTextFromParts(response.realtimeResponse.parts);
            updateConversationBuffer('assistant', assistantText);
        }

        if (response.serverContent?.modelTurn?.parts) {
            const assistantText = coalesceTextFromParts(response.serverContent.modelTurn.parts);
            updateConversationBuffer('assistant', assistantText);
        }

        if (response.clientContent?.parts) {
            const userText = coalesceTextFromParts(response.clientContent.parts);
            updateConversationBuffer('user', userText);
        }

        if (response.serverContent?.clientTurn?.parts) {
            const userText = coalesceTextFromParts(response.serverContent.clientTurn.parts);
            updateConversationBuffer('user', userText);
        }
    };

    const ensurePlaybackContext = async (sampleRate) => {
        if (!playbackContextRef.current) {
            playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: sampleRate || DEFAULT_PLAYBACK_SAMPLE_RATE
            });
            playbackGainRef.current = playbackContextRef.current.createGain();
            playbackGainRef.current.gain.value = 1;
            playbackGainRef.current.connect(playbackContextRef.current.destination);
            playbackStateRef.current.nextStartTime = playbackContextRef.current.currentTime;
        }

        const audioContext = playbackContextRef.current;
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        return audioContext;
    };

    const queueDecodedAudio = async (channelBuffer, sampleRate) => {
        try {
            if (!channelBuffer) {
                return;
            }

            const audioContext = await ensurePlaybackContext(sampleRate);
            if (!audioContext) {
                return;
            }

            const channelData = channelBuffer instanceof Float32Array
                ? channelBuffer
                : new Float32Array(channelBuffer);

            const audioBuffer = audioContext.createBuffer(
                1,
                channelData.length,
                sampleRate || audioContext.sampleRate
            );
            audioBuffer.copyToChannel(channelData, 0);

            const startTime = Math.max(
                playbackStateRef.current.nextStartTime,
                audioContext.currentTime + PLAYBACK_START_DELAY
            );

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(playbackGainRef.current);

            source.onended = () => {
                playbackStateRef.current.activeSources = Math.max(
                    playbackStateRef.current.activeSources - 1,
                    0
                );
                if (playbackStateRef.current.activeSources === 0) {
                    playbackStateRef.current.nextStartTime = audioContext.currentTime;
                    setIsPlaying(false);
                }
            };

            source.start(startTime);
            playbackStateRef.current.activeSources += 1;
            playbackStateRef.current.nextStartTime = startTime + audioBuffer.duration;
            setIsPlaying(true);
        } catch (error) {
            console.error('Error scheduling decoded audio:', error);
        }
    };

    const ensureDecodeWorker = () => {
        if (typeof window === 'undefined' || !window.Worker) {
            return null;
        }

        if (!decodeWorkerRef.current) {
            try {
                const worker = new Worker(new URL('./audio/decodeWorker.js', import.meta.url), {
                    type: 'module'
                });

                worker.onmessage = ({ data }) => {
                    if (!data) {
                        return;
                    }

                    if (data.error) {
                        console.error('Audio decode worker error:', data.error);
                        return;
                    }

                    void queueDecodedAudio(data.audioBuffer, data.sampleRate);
                };

                worker.onerror = (event) => {
                    console.error('Audio decode worker runtime error:', event.message);
                };

                decodeWorkerRef.current = worker;
            } catch (error) {
                console.error('Failed to initialize audio decode worker:', error);
                decodeWorkerRef.current = null;
            }
        }

        return decodeWorkerRef.current;
    };

    const decodeChunkOnMainThread = (base64AudioData, mimeType) => {
        if (!base64AudioData) {
            return;
        }

        const binaryString = atob(base64AudioData);
        const audioData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            audioData[i] = binaryString.charCodeAt(i);
        }

        const sampleRate = parseSampleRateFromMime(mimeType);
        const sampleCount = audioData.length / 2;
        const floatChannelData = new Float32Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
            const sample = (audioData[i * 2] | (audioData[i * 2 + 1] << 8));
            const signedSample = sample > 32767 ? sample - 65536 : sample;
            floatChannelData[i] = signedSample / 32768.0;
        }

        void queueDecodedAudio(floatChannelData, sampleRate);
    };

    const handleAudioChunk = (base64AudioData, mimeType) => {
        try {
            const worker = ensureDecodeWorker();
            if (worker) {
                const requestId = decodeRequestIdRef.current++;
                worker.postMessage({
                    id: requestId,
                    base64AudioData,
                    mimeType
                });
            } else {
                decodeChunkOnMainThread(base64AudioData, mimeType);
            }
        } catch (error) {
            console.error('Error handling audio chunk:', error);
        }
    };

    const getWebSocketUrl = () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY is not configured');
        }

        return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    };

    const startRecording = async () => {
        try {
            setIsError(false);
            setIsLoading(true);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: CAPTURE_SAMPLE_RATE,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            streamRef.current = stream;
            resetVadState();
            resetConversationBuffers();

            const websocketUrl = getWebSocketUrl();
            socketRef.current = new WebSocket(websocketUrl);

            socketRef.current.onopen = () => {
                console.log('WebSocket connection established');

                const setupMessage = {
                    setup: {
                        model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: 'Orus'
                                    }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [
                                {
                                    text: getSerinVoiceInstruction()
                                }
                            ]
                        }
                    }
                };

                socketRef.current.send(JSON.stringify(setupMessage));
            };

            socketRef.current.onmessage = async (event) => {
                try {
                    let response;

                    if (typeof event.data === 'string') {
                        response = JSON.parse(event.data);
                    } else if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        response = JSON.parse(text);
                    } else {
                        console.warn('Unexpected data type:', typeof event.data);
                        return;
                    }

                    console.log('Received response:', response);
                    handleTextualSegments(response);

                    if (response.setupComplete) {
                        console.log('Setup complete, starting Web Audio API recording...');

                        if (!captureContextRef.current) {
                            captureContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                                sampleRate: CAPTURE_SAMPLE_RATE
                            });
                        }

                        const audioContext = captureContextRef.current;
                        if (audioContext.state === 'suspended') {
                            await audioContext.resume();
                        }

                        if (!audioContext.audioWorklet) {
                            throw new Error('AudioWorklet API is not supported in this browser.');
                        }

                        if (!audioWorkletModuleLoadedRef.current) {
                            await audioContext.audioWorklet.addModule(new URL('./audio/pcmWorkletProcessor.js', import.meta.url));
                            audioWorkletModuleLoadedRef.current = true;
                        }

                        const source = audioContext.createMediaStreamSource(stream);
                        const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor', {
                            numberOfInputs: 1,
                            numberOfOutputs: 1,
                            outputChannelCount: [1],
                            channelCount: 1
                        });

                        const silentGain = audioContext.createGain();
                        silentGain.gain.value = 0;

                        let isProcessing = true;

                        const sendChunk = (pcmChunk) => {
                            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                                return;
                            }

                            const base64Audio = convertInt16ToBase64(pcmChunk);
                            if (!base64Audio) {
                                return;
                            }

                            const audioMessage = {
                                realtimeInput: {
                                    mediaChunks: [{
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: base64Audio
                                    }]
                                }
                            };

                            socketRef.current.send(JSON.stringify(audioMessage));
                        };

                        workletNode.port.onmessage = (event) => {
                            if (!isProcessing || socketRef.current?.readyState !== WebSocket.OPEN) {
                                return;
                            }

                            const rawData = event.data instanceof ArrayBuffer ? new Int16Array(event.data) : event.data;
                            if (!rawData || rawData.length === 0) {
                                return;
                            }

                            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                            const vadState = vadStateRef.current;
                            const chunkDurationMs = (rawData.length / CAPTURE_SAMPLE_RATE) * 1000;
                            const rms = computeRms(rawData);
                            const loudEnoughToStart = rms >= VAD_RMS_START_THRESHOLD;
                            const loudEnoughToContinue = rms >= VAD_RMS_CONTINUE_THRESHOLD;

                            if (loudEnoughToStart) {
                                if (!vadState.isSpeech) {
                                    if (vadState.speechStartTs === 0) {
                                        vadState.speechStartTs = now;
                                    }

                                    vadState.pendingChunks.push(rawData.slice());
                                    const elapsed = (now - vadState.speechStartTs) + chunkDurationMs;
                                    if (elapsed >= VAD_MIN_SPEECH_DURATION_MS) {
                                        vadState.isSpeech = true;
                                        vadState.lastSpeechTs = now;
                                        vadState.pendingChunks.forEach(sendChunk);
                                        vadState.pendingChunks = [];
                                    }
                                } else {
                                    vadState.lastSpeechTs = now;
                                    sendChunk(rawData);
                                }

                                return;
                            }

                            if (vadState.isSpeech && loudEnoughToContinue) {
                                vadState.lastSpeechTs = now;
                                sendChunk(rawData);
                                return;
                            }

                            if (vadState.isSpeech) {
                                if (now - vadState.lastSpeechTs <= VAD_MAX_SILENCE_DURATION_MS) {
                                    sendChunk(rawData);
                                } else {
                                    vadState.isSpeech = false;
                                    vadState.speechStartTs = 0;
                                    vadState.pendingChunks = [];
                                }
                            } else {
                                vadState.pendingChunks = [];
                                vadState.speechStartTs = 0;
                            }
                        };

                        workletNode.connect(silentGain);
                        silentGain.connect(audioContext.destination);
                        source.connect(workletNode);

                        const audioProcessor = {
                            workletNode,
                            source,
                            silentGain,
                            stop: () => {
                                isProcessing = false;
                                workletNode.port.onmessage = null;
                            }
                        };

                        mediaRecorderRef.current = audioProcessor;

                        setIsRecording(true);
                        setIsLoading(false);
                        return;
                    }

                    let audioProcessed = false;

                    if (response.realtimeResponse?.parts) {
                        const audioPart = response.realtimeResponse.parts.find(part =>
                            part.inlineData?.mimeType?.includes('audio')
                        );

                        if (audioPart && audioPart.inlineData?.data) {
                            console.log('Processing REALTIME audio chunk, mimeType:', audioPart.inlineData.mimeType, 'data length:', audioPart.inlineData.data.length);
                            setIsLoading(false);
                            handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                            audioProcessed = true;
                        }
                    }

                    if (!audioProcessed && response.serverContent?.modelTurn?.parts) {
                        const audioPart = response.serverContent.modelTurn.parts.find(part =>
                            part.inlineData?.mimeType?.includes('audio')
                        );

                        if (audioPart && audioPart.inlineData?.data) {
                            console.log('Processing SERVER audio chunk, mimeType:', audioPart.inlineData.mimeType, 'data length:', audioPart.inlineData.data.length);
                            setIsLoading(false);
                            handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                            audioProcessed = true;
                        }
                    }

                    if (audioProcessed) {
                        console.log('Audio response processed successfully');
                    }
                } catch (error) {
                    console.error('Error processing audio response:', error);
                    console.log('Raw event data:', event.data);
                }
            };

            socketRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsError(true);
                setIsLoading(false);
            };

            socketRef.current.onclose = (event) => {
                console.log('WebSocket connection closed', event.code, event.reason);

                if (mediaRecorderRef.current?.workletNode) {
                    console.log('Stopping audio processing due to WebSocket close');
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.workletNode.disconnect();
                    mediaRecorderRef.current.source.disconnect();
                    mediaRecorderRef.current.silentGain.disconnect();
                    mediaRecorderRef.current = null;
                }

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                if (captureContextRef.current) {
                    captureContextRef.current.close();
                    captureContextRef.current = null;
                    audioWorkletModuleLoadedRef.current = false;
                }

                if (playbackContextRef.current) {
                    playbackContextRef.current.close();
                    playbackContextRef.current = null;
                    playbackGainRef.current = null;
                }

                playbackStateRef.current = { nextStartTime: 0, activeSources: 0 };
                resetVadState();
                resetConversationBuffers();

                setIsLoading(false);
                setIsRecording(false);
                setIsPlaying(false);
            };
        } catch (error) {
            console.error('Error starting recording:', error);
            setIsError(true);
            setIsLoading(false);
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording...');

        setIsRecording(false);

        if (mediaRecorderRef.current?.workletNode) {
            console.log('Stopping audio processing and disconnecting...');
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.workletNode.disconnect();
            mediaRecorderRef.current.source.disconnect();
            mediaRecorderRef.current.silentGain.disconnect();
            mediaRecorderRef.current = null;
        }

        if (streamRef.current) {
            console.log('Stopping media stream...');
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (captureContextRef.current) {
            captureContextRef.current.close();
            captureContextRef.current = null;
            audioWorkletModuleLoadedRef.current = false;
        }

        resetVadState();
        resetConversationBuffers();

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log('Sending completion signal...');
            const completionMessage = {
                realtimeInput: {
                    mediaChunks: []
                }
            };
            socketRef.current.send(JSON.stringify(completionMessage));
        }

        setIsLoading(true);

        console.log('Recording stopped, waiting for response...');
    };

    const sendTestAudio = async (audioFilename) => {
        try {
            setIsError(false);
            setIsLoading(true);

            console.log('Loading test audio file:', audioFilename);
            resetConversationBuffers();

            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                const websocketUrl = getWebSocketUrl();
                socketRef.current = new WebSocket(websocketUrl);

                await new Promise((resolve, reject) => {
                    socketRef.current.onopen = () => {
                        console.log('WebSocket connection established for test audio');

                        const setupMessage = {
                            setup: {
                                model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
                                generationConfig: {
                                    responseModalities: ['AUDIO'],
                                    speechConfig: {
                                        voiceConfig: {
                                            prebuiltVoiceConfig: {
                                                voiceName: 'Orus'
                                            }
                                        }
                                    }
                                },
                                systemInstruction: {
                                    parts: [
                                        {
                                            text: getSerinVoiceInstruction()
                                        }
                                    ]
                                }
                            }
                        };

                        socketRef.current.send(JSON.stringify(setupMessage));
                        resolve();
                    };

                    socketRef.current.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        reject(error);
                    };

                    socketRef.current.onclose = (event) => {
                        console.log('WebSocket connection closed', event.code, event.reason);
                        setIsLoading(false);
                        setIsPlaying(false);
                        if (playbackContextRef.current) {
                            playbackContextRef.current.close();
                            playbackContextRef.current = null;
                            playbackGainRef.current = null;
                        }
                        playbackStateRef.current = { nextStartTime: 0, activeSources: 0 };
                    };

                    socketRef.current.onmessage = async (event) => {
                        try {
                            let response;

                            if (typeof event.data === 'string') {
                                response = JSON.parse(event.data);
                            } else if (event.data instanceof Blob) {
                                const text = await event.data.text();
                                response = JSON.parse(text);
                            } else {
                                console.warn('Unexpected data type:', typeof event.data);
                                return;
                            }

                            console.log('Received response:', response);
                            handleTextualSegments(response);

                            if (response.setupComplete) {
                                console.log('Setup complete for test audio');
                                return;
                            }

                            let audioProcessed = false;

                            if (response.realtimeResponse?.parts) {
                                const audioPart = response.realtimeResponse.parts.find(part =>
                                    part.inlineData?.mimeType?.includes('audio')
                                );

                                if (audioPart && audioPart.inlineData?.data) {
                                    console.log('Processing REALTIME audio chunk');
                                    setIsLoading(false);
                                    handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                                    audioProcessed = true;
                                }
                            }

                            if (!audioProcessed && response.serverContent?.modelTurn?.parts) {
                                const audioPart = response.serverContent.modelTurn.parts.find(part =>
                                    part.inlineData?.mimeType?.includes('audio')
                                );

                                if (audioPart && audioPart.inlineData?.data) {
                                    console.log('Processing SERVER audio chunk');
                                    setIsLoading(false);
                                    handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                                    audioProcessed = true;
                                }
                            }
                        } catch (error) {
                            console.error('Error processing audio response:', error);
                        }
                    };
                });
            }

            const response = await fetch(`/test-audio/${audioFilename}`);
            if (!response.ok) {
                throw new Error(`Failed to load test audio file: ${audioFilename}`);
            }

            const arrayBuffer = await response.arrayBuffer();

            const uint8Array = new Uint8Array(arrayBuffer);
            let binaryString = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.slice(i, i + chunkSize);
                binaryString += String.fromCharCode(...chunk);
            }
            const base64Audio = btoa(binaryString);

            const audioMessage = {
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Audio
                    }]
                }
            };

            console.log('Sending test audio chunk, size:', arrayBuffer.byteLength);
            socketRef.current.send(JSON.stringify(audioMessage));

            setTimeout(() => {
                const completionMessage = {
                    realtimeInput: {
                        mediaChunks: []
                    }
                };
                socketRef.current.send(JSON.stringify(completionMessage));
                console.log('Test audio completed, waiting for response...');
            }, 100);
        } catch (error) {
            console.error('Error sending test audio:', error);
            setIsError(true);
            setIsLoading(false);
        }
    };

    return {
        isRecording,
        isPlaying,
        isLoading,
        isError,
        startRecording,
        stopRecording,
        sendTestAudio
    };
};

export const __testables = {
    convertInt16ToBase64,
    parseSampleRateFromMime,
    computeRms
};
