import { useState, useRef, useEffect } from 'react';
import { getSerinVoiceInstruction } from './utils/serinPrompt';

const VAD_MIN_SPEECH_DURATION_MS = 250;
const VAD_MAX_SILENCE_DURATION_MS = 1000;
const VAD_VOICE_PROBABILITY = 0.8;

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
            if (audioPlaybackTimeoutRef.current) {
                clearTimeout(audioPlaybackTimeoutRef.current);
            }
            audioQueueRef.current = [];
            isProcessingAudioRef.current = false;
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
                        
                        // Use Web Audio API for raw PCM audio capture
                        if (!audioContextRef.current) {
                            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                                sampleRate: 16000
                            });
                        }
                        
                        const audioContext = audioContextRef.current;
                        if (audioContext.state === 'suspended') {
                            await audioContext.resume();
                        }
                        
                        const source = audioContext.createMediaStreamSource(stream);
                        const processor = audioContext.createScriptProcessor(4096, 1, 1);
                        
                        let isProcessing = true;
                        
                        processor.onaudioprocess = (event) => {
                            console.log("Audio process event triggered, isProcessing:", isProcessing, "WebSocket state:", socketRef.current?.readyState);
                            
                            if (socketRef.current?.readyState === WebSocket.OPEN && isProcessing) {
                                const inputBuffer = event.inputBuffer;
                                const inputData = inputBuffer.getChannelData(0);
                                
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
                                    
                                    // Convert to base64
                                    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                                    
                                    const audioMessage = {
                                        realtimeInput: {
                                            mediaChunks: [{
                                                mimeType: "audio/pcm;rate=16000",
                                                data: base64Audio
                                            }]
                                        }
                                    };
                                    
                                    console.log("Sending PCM audio chunk, size:", pcmData.length);
                                    socketRef.current.send(JSON.stringify(audioMessage));
                                } else {
                                    console.log("Silent audio chunk, skipping");
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
            };

        } catch (error) {
            console.error("Error starting recording:", error);
            setIsError(true);
            setIsLoading(false);
        }
    };

    const handleAudioChunk = async (base64AudioData, mimeType) => {
        try {
            // Convert base64 to binary data
            const binaryString = atob(base64AudioData);
            const audioData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                audioData[i] = binaryString.charCodeAt(i);
            }
            
            // Add chunk to current buffer
            audioChunksRef.current.push(audioData);
            console.log(`Added audio chunk. Buffer now has ${audioChunksRef.current.length} chunks`);
            
            // Clear any existing timeout
            if (audioPlaybackTimeoutRef.current) {
                clearTimeout(audioPlaybackTimeoutRef.current);
            }
            
            // Set a new timeout to process the audio after chunks stop coming
            audioPlaybackTimeoutRef.current = setTimeout(() => {
                processAudioBuffer(mimeType);
            }, 500); // Wait 500ms after last chunk
            
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
        
        // Add to queue
        audioQueueRef.current.push({ chunks: audioToQueue, mimeType });
        console.log(`Added audio to queue. Queue length: ${audioQueueRef.current.length}`);
        
        // Process queue if not already processing
        if (!isProcessingAudioRef.current) {
            processAudioQueue();
        }
    };

    const processAudioQueue = async () => {
        if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) {
            return;
        }

        isProcessingAudioRef.current = true;
        console.log(`Starting audio queue processing. ${audioQueueRef.current.length} items in queue`);

        while (audioQueueRef.current.length > 0) {
            const audioItem = audioQueueRef.current.shift();
            await playBufferedAudio(audioItem.chunks, audioItem.mimeType);
        }

        isProcessingAudioRef.current = false;
        console.log("Audio queue processing completed");
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
            
            // Parse sample rate from mimeType (e.g., "audio/pcm;rate=24000")
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;
            
            // Convert raw PCM data to AudioBuffer
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: sampleRate
                });
            }
            
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            // Create audio buffer for the PCM data
            // PCM data is 16-bit signed integers, so divide length by 2 for sample count
            const sampleCount = combinedAudio.length / 2;
            const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
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
                    console.log("Audio playback completed");
                    setIsPlaying(false);
                    resolve();
                };
                
                source.onerror = () => {
                    console.error("Audio playback error");
                    setIsPlaying(false);
                    resolve();
                };
                
                source.start(0);
                console.log(`Started playing audio: ${sampleCount} samples at ${sampleRate}Hz`);
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