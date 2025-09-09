import { useState, useRef, useEffect } from 'react';
import { getSerinVoiceInstruction } from './utils/serinPrompt';

// Optimized constants for low-latency streaming
const AUDIO_BUFFER_SIZE = 1024; // Reduced from 4096 for lower latency (~64ms chunks at 16kHz)
const AUDIO_CHUNK_TIMEOUT = 100; // Reduced from 500ms for faster processing
const SAMPLE_RATE = 16000; // Consistent sample rate for recording and playback
const VAD_MIN_SPEECH_DURATION_MS = 150; // Reduced for faster detection
const VAD_MAX_SILENCE_DURATION_MS = 800; // Reduced for quicker responses
const VAD_VOICE_PROBABILITY = 0.6; // Lower threshold for more responsive detection
const PERFORMANCE_LOG_INTERVAL = 1000; // Log performance metrics every second

// Voice Activity Detection utility
const detectVoiceActivity = (audioData) => {
    // Calculate RMS (Root Mean Square) energy
    let sum = 0;
    let maxAmplitude = 0;
    
    for (let i = 0; i < audioData.length; i++) {
        const sample = audioData[i];
        sum += sample * sample;
        maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
    }
    
    const rms = Math.sqrt(sum / audioData.length);
    const audioLevel = maxAmplitude;
    
    // Dynamic threshold based on recent audio levels
    const voiceThreshold = 0.01; // Lowered for better sensitivity
    const hasVoice = rms > voiceThreshold && maxAmplitude > 0.005;
    
    return { hasVoice, audioLevel, rms };
};

// Enhanced performance monitoring utility
const logPerformanceMetrics = (metrics) => {
    if (metrics.audioChunksReceived > 0) {
        const avgLatency = metrics.totalProcessingTime / metrics.audioChunksReceived;
        const throughput = (metrics.audioChunksReceived * AUDIO_BUFFER_SIZE / SAMPLE_RATE).toFixed(2);
        console.log(`[Performance Monitor] Chunks: ${metrics.audioChunksReceived}, Avg Latency: ${avgLatency.toFixed(2)}ms, Throughput: ${throughput}s audio, Buffer: ${AUDIO_BUFFER_SIZE} samples`);
        console.log(`[Latency Breakdown] Last chunk: ${metrics.lastChunkTime.toFixed(2)}ms, Target: <${AUDIO_CHUNK_TIMEOUT}ms timeout`);
    }
};

// Real-time latency monitoring
const checkLatencyHealth = (processingTime) => {
    const targetLatency = AUDIO_BUFFER_SIZE / SAMPLE_RATE * 1000; // Expected chunk duration
    if (processingTime > targetLatency * 2) {
        console.warn(`[Latency Warning] Processing time ${processingTime.toFixed(2)}ms exceeds optimal ${targetLatency.toFixed(2)}ms`);
    }
};

export const useVoiceToGemini = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    const mediaRecorderRef = useRef(null);
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlaybackTimeoutRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isProcessingAudioRef = useRef(false);
    const streamingAudioRef = useRef(null); // For streaming audio playback
    const performanceMetricsRef = useRef({
        audioChunksReceived: 0,
        totalProcessingTime: 0,
        lastChunkTime: 0,
        averageLatency: 0
    });
    const vadSilenceStartRef = useRef(0);
    const vadIsSpeakingRef = useRef(false);

    // Performance monitoring
    const updatePerformanceMetrics = (processingTime) => {
        const metrics = performanceMetricsRef.current;
        metrics.audioChunksReceived++;
        metrics.totalProcessingTime += processingTime;
        metrics.lastChunkTime = processingTime;
        
        // Log metrics every second
        if (metrics.audioChunksReceived % Math.floor(PERFORMANCE_LOG_INTERVAL / (AUDIO_BUFFER_SIZE / SAMPLE_RATE * 1000)) === 0) {
            logPerformanceMetrics(metrics);
        }
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (streamingAudioRef.current) {
                streamingAudioRef.current.stop();
                streamingAudioRef.current = null;
            }
            if (audioPlaybackTimeoutRef.current) {
                clearTimeout(audioPlaybackTimeoutRef.current);
            }
            audioQueueRef.current = [];
            isProcessingAudioRef.current = false;
            if (streamingAudioRef.current) {
                streamingAudioRef.current.stop();
                streamingAudioRef.current = null;
            }
            // Reset performance metrics
            performanceMetricsRef.current = {
                audioChunksReceived: 0,
                totalProcessingTime: 0,
                lastChunkTime: 0,
                averageLatency: 0
            };
        };
    }, []);

    const getWebSocketUrl = () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY is not configured');
        }
        
        // Using the correct Gemini Live API WebSocket endpoint
        return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    };

    const startRecording = async () => {
        try {
            setIsError(false);
            setIsLoading(true);

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            streamRef.current = stream;
            
            const websocketUrl = getWebSocketUrl();
            socketRef.current = new WebSocket(websocketUrl);

            socketRef.current.onopen = () => {
                console.log("WebSocket connection established");
                
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.5-flash-preview-native-audio-dialog",
                        generation_config: {
                            response_modalities: ["AUDIO"],
                            speech_config: {
                                voice_config: {
                                    prebuilt_voice_config: {
                                        voice_name: "Orus"
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
                    
                    // Handle both text and blob responses
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
                    
                    // Handle setup completion
                    if (response.setupComplete) {
                        console.log("Setup complete, starting Web Audio API recording...");
                        
                        // Use Web Audio API for low-latency PCM audio capture
                        if (!audioContextRef.current) {
                            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                                sampleRate: SAMPLE_RATE,
                                latencyHint: 'interactive' // Optimize for low latency
                            });
                        }
                        
                        const audioContext = audioContextRef.current;
                        if (audioContext.state === 'suspended') {
                            await audioContext.resume();
                        }
                        
                        const source = audioContext.createMediaStreamSource(stream);
                        const processor = audioContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
                        
                        let isProcessing = true;
                        
                        processor.onaudioprocess = (event) => {
                            const processingStartTime = performance.now();
                            
                            if (socketRef.current?.readyState === WebSocket.OPEN && isProcessing) {
                                const inputBuffer = event.inputBuffer;
                                const inputData = inputBuffer.getChannelData(0);
                                
                                // Enhanced Voice Activity Detection
                                const { hasVoice } = detectVoiceActivity(inputData);
                                
                                if (hasVoice) {
                                    vadIsSpeakingRef.current = true;
                                    vadSilenceStartRef.current = 0;
                                    
                                    // Optimized PCM conversion - direct binary without base64
                                    const pcmData = new Int16Array(inputData.length);
                                    for (let i = 0; i < inputData.length; i++) {
                                        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                                    }
                                    
                                    // More efficient base64 encoding
                                    const uint8Array = new Uint8Array(pcmData.buffer);
                                    const base64Audio = btoa(String.fromCharCode.apply(null, uint8Array));
                                    
                                    const audioMessage = {
                                        realtimeInput: {
                                            mediaChunks: [{
                                                mimeType: `audio/pcm;rate=${SAMPLE_RATE}`,
                                                data: base64Audio
                                            }]
                                        }
                                    };
                                    
                                    socketRef.current.send(JSON.stringify(audioMessage));
                                    
                                    // Enhanced performance monitoring
                                    const processingTime = performance.now() - processingStartTime;
                                    updatePerformanceMetrics(processingTime);
                                    checkLatencyHealth(processingTime);
                                } else {
                                    // Handle silence detection
                                    if (vadIsSpeakingRef.current) {
                                        if (vadSilenceStartRef.current === 0) {
                                            vadSilenceStartRef.current = Date.now();
                                        } else if (Date.now() - vadSilenceStartRef.current > VAD_MAX_SILENCE_DURATION_MS) {
                                            vadIsSpeakingRef.current = false;
                                        }
                                    }
                                }
                            }
                        };
                        
                        // Store the processing flag so we can stop it
                        const audioProcessor = { processor, source, isProcessing: () => isProcessing, stop: () => { isProcessing = false; } };
                        
                        source.connect(processor);
                        processor.connect(audioContext.destination);
                        
                        // Store the audio processor so we can stop it later
                        mediaRecorderRef.current = audioProcessor;
                        
                        setIsRecording(true);
                        setIsLoading(false);
                        return;
                    }
                    
                    // Handle audio responses - prioritize realtimeResponse over serverContent to avoid duplicates
                    let audioProcessed = false;
                    
                    // Check realtime responses first (preferred format)
                    if (response.realtimeResponse?.parts) {
                        const audioPart = response.realtimeResponse.parts.find(part => 
                            part.inlineData?.mimeType?.includes('audio')
                        );
                        
                        if (audioPart && audioPart.inlineData?.data) {
                            console.log("Processing REALTIME audio chunk, mimeType:", audioPart.inlineData.mimeType, "data length:", audioPart.inlineData.data.length);
                            setIsLoading(false);
                            await handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                            audioProcessed = true;
                        }
                    }
                    
                    // Only process serverContent if no realtime response was found
                    if (!audioProcessed && response.serverContent?.modelTurn?.parts) {
                        const audioPart = response.serverContent.modelTurn.parts.find(part => 
                            part.inlineData?.mimeType?.includes('audio')
                        );
                        
                        if (audioPart && audioPart.inlineData?.data) {
                            console.log("Processing SERVER audio chunk, mimeType:", audioPart.inlineData.mimeType, "data length:", audioPart.inlineData.data.length);
                            setIsLoading(false);
                            await handleAudioChunk(audioPart.inlineData.data, audioPart.inlineData.mimeType);
                            audioProcessed = true;
                        }
                    }
                    
                    if (audioProcessed) {
                        console.log("Audio response processed successfully");
                    }
                } catch (error) {
                    console.error("Error processing audio response:", error);
                    console.log("Raw event data:", event.data);
                }
            };

            socketRef.current.onerror = (error) => {
                console.error("WebSocket error:", error);
                setIsError(true);
                setIsLoading(false);
            };

            socketRef.current.onclose = (event) => {
                console.log("WebSocket connection closed", event.code, event.reason);
                
                // Clean up Web Audio API components
                if (mediaRecorderRef.current?.processor) {
                    console.log("Stopping audio processing due to WebSocket close");
                    mediaRecorderRef.current.stop(); // Stop the processing flag
                    mediaRecorderRef.current.processor.disconnect();
                    mediaRecorderRef.current.source.disconnect();
                    mediaRecorderRef.current = null;
                }
                
                // Stop media stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                
                setIsLoading(false);
                setIsRecording(false);
                setIsPlaying(false);
                
                // Clear audio queue and processing state
                audioQueueRef.current = [];
                isProcessingAudioRef.current = false;
                audioChunksRef.current = [];
                if (audioPlaybackTimeoutRef.current) {
                    clearTimeout(audioPlaybackTimeoutRef.current);
                    audioPlaybackTimeoutRef.current = null;
                }
                
                // Stop any streaming audio
                if (streamingAudioRef.current) {
                    streamingAudioRef.current.stop();
                    streamingAudioRef.current = null;
                }
                
                // Reset performance metrics
                performanceMetricsRef.current = {
                    audioChunksReceived: 0,
                    totalProcessingTime: 0,
                    lastChunkTime: 0,
                    averageLatency: 0
                };
                
                console.log('[Optimized] WebSocket cleanup completed - all audio stopped');
            };

        } catch (error) {
            console.error("Error starting recording:", error);
            setIsError(true);
            setIsLoading(false);
        }
    };

    const handleAudioChunk = async (base64AudioData, mimeType) => {
        try {
            const chunkStartTime = performance.now();
            
            // Convert base64 to binary data
            const binaryString = atob(base64AudioData);
            const audioData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                audioData[i] = binaryString.charCodeAt(i);
            }
            
            // Add chunk to current buffer
            audioChunksRef.current.push(audioData);
            console.log(`[Optimized] Added audio chunk ${audioChunksRef.current.length} (${audioData.length} bytes)`);
            
            // Clear any existing timeout
            if (audioPlaybackTimeoutRef.current) {
                clearTimeout(audioPlaybackTimeoutRef.current);
            }
            
            // Aggressive early start: if this is the first chunk and we have reasonable data, start immediately
            if (audioChunksRef.current.length === 1 && audioData.length > 1024) {
                console.log('[Optimized] First substantial chunk - starting immediate playback');
                processAudioBuffer(mimeType);
                return;
            }
            
            // Otherwise use reduced timeout for subsequent chunks
            audioPlaybackTimeoutRef.current = setTimeout(() => {
                processAudioBuffer(mimeType);
            }, AUDIO_CHUNK_TIMEOUT);
            
            const processingTime = performance.now() - chunkStartTime;
            console.log(`[Performance] Chunk processed in ${processingTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error("Error handling audio chunk:", error);
        }
    };

    const processAudioBuffer = (mimeType) => {
        if (audioChunksRef.current.length === 0) {
            console.log("No audio chunks to process");
            return;
        }

        // Move current buffer to queue and reset buffer for next response
        const audioToQueue = [...audioChunksRef.current];
        audioChunksRef.current = [];
        
        // Add to queue with priority for immediate processing
        audioQueueRef.current.push({ chunks: audioToQueue, mimeType });
        console.log(`[Optimized] Added ${audioToQueue.length} chunks to queue. Queue length: ${audioQueueRef.current.length}`);
        
        // Immediate processing for low latency - don't wait
        if (!isProcessingAudioRef.current) {
            // Start processing immediately without delay
            setTimeout(() => processAudioQueue(), 0);
        }
    };

    const processAudioQueue = async () => {
        if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) {
            return;
        }

        isProcessingAudioRef.current = true;
        console.log(`Starting streaming audio processing. ${audioQueueRef.current.length} items in queue`);

        // Process all queued audio items concurrently for streaming effect
        const audioPromises = [];
        while (audioQueueRef.current.length > 0) {
            const audioItem = audioQueueRef.current.shift();
            // Don't await here - allow concurrent processing
            audioPromises.push(playBufferedAudio(audioItem.chunks, audioItem.mimeType));
        }

        // Wait for all audio to complete
        try {
            await Promise.all(audioPromises);
        } catch (error) {
            console.error('Error in streaming audio processing:', error);
        }

        isProcessingAudioRef.current = false;
        console.log("Streaming audio processing completed");
    };

    const playBufferedAudio = async (audioChunks, mimeType) => {
        try {
            if (!audioChunks || audioChunks.length === 0) {
                console.log("No audio chunks to play");
                return;
            }
            
            console.log(`Playing ${audioChunks.length} audio chunks with mimeType: ${mimeType}`);
            setIsPlaying(true);
            
            // Concatenate all audio chunks
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combinedAudio = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of audioChunks) {
                combinedAudio.set(chunk, offset);
                offset += chunk.length;
            }
            
            // Use consistent sample rate for all audio processing
            // Parse from mimeType but fallback to optimized constant
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const audioSampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : SAMPLE_RATE;
            
            // Optimize AudioBuffer creation with consistent sample rate
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: audioSampleRate,
                    latencyHint: 'interactive'
                });
            }
            
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            // Create optimized audio buffer for immediate playback
            // PCM data is 16-bit signed integers, so divide length by 2 for sample count
            const sampleCount = combinedAudio.length / 2;
            const audioBuffer = audioContext.createBuffer(1, sampleCount, audioSampleRate);
            const channelData = audioBuffer.getChannelData(0);
            
            // Convert 16-bit PCM to float values (-1.0 to 1.0)
            for (let i = 0; i < sampleCount; i++) {
                const sample = (combinedAudio[i * 2] | (combinedAudio[i * 2 + 1] << 8));
                // Convert signed 16-bit to signed value
                const signedSample = sample > 32767 ? sample - 65536 : sample;
                channelData[i] = signedSample / 32768.0;
            }
            
            // Play the audio
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            return new Promise((resolve) => {
                source.onended = () => {
                    console.log("[Optimized] Audio playback completed");
                    if (streamingAudioRef.current === source) {
                        streamingAudioRef.current = null;
                    }
                    setIsPlaying(false);
                    resolve();
                };
                
                source.onerror = () => {
                    console.error("Audio playback error");
                    setIsPlaying(false);
                    resolve();
                };
                
                // Immediate audio start for reduced latency
                source.start(0);
                console.log(`[Optimized] Playing ${sampleCount} samples at ${audioSampleRate}Hz - Latency optimized`);
                
                // Store reference for potential interruption
                streamingAudioRef.current = source;
            });
            
        } catch (error) {
            console.error("Error playing buffered audio:", error);
            setIsPlaying(false);
            return Promise.resolve();
        }
    };


    const stopRecording = () => {
        console.log("Stopping recording...");
        
        setIsRecording(false);
        
        // Clean up Web Audio API components
        if (mediaRecorderRef.current?.processor) {
            console.log("Stopping audio processing and disconnecting...");
            mediaRecorderRef.current.stop(); // Stop the processing flag
            mediaRecorderRef.current.processor.disconnect();
            mediaRecorderRef.current.source.disconnect();
            mediaRecorderRef.current = null;
        }
        
        if (streamRef.current) {
            console.log("Stopping media stream...");
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Send completion signal
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log("Sending completion signal...");
            const completionMessage = {
                realtimeInput: {
                    mediaChunks: []
                }
            };
            socketRef.current.send(JSON.stringify(completionMessage));
        }
        
        setIsLoading(true); // Keep loading while processing
        
        console.log("Recording stopped, waiting for response...");
    };

    return { 
        isRecording, 
        isPlaying, 
        isLoading, 
        isError, 
        startRecording, 
        stopRecording 
    };
};