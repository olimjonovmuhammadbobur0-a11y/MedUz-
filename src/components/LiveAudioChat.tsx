import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Loader2, PhoneOff } from 'lucide-react';

interface LiveAudioChatProps {
  systemInstruction: string;
  initialMessage: string;
  onEnd: (transcript: {role: 'user' | 'model', text: string}[]) => void;
}

export function LiveAudioChat({ systemInstruction, initialMessage, onEnd }: LiveAudioChatProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptRef = useRef<{role: 'user' | 'model', text: string}[]>([]);
  const onEndCalledRef = useRef(false);

  const handleEnd = () => {
    if (onEndCalledRef.current) return;
    onEndCalledRef.current = true;
    onEnd(transcriptRef.current);
  };

  useEffect(() => {
    let isMounted = true;
    
    const initLiveAPI = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        source.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
        
        const sessionPromise = ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction,
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          } as any, // Cast to any to bypass strict type checking for transcription fields if not in types yet
          callbacks: {
            onopen: () => {
              if (!isMounted) return;
              setIsConnecting(false);
              setIsConnected(true);
              
              // Send an initial message to prompt the AI to start
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  text: `Please start the conversation by saying exactly this: "${initialMessage}"`
                });
              });
              
              processorRef.current!.onaudioprocess = (e) => {
                if (isMuted) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                let binary = '';
                const bytes = new Uint8Array(pcmData.buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);
                
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              };
            },
            onmessage: (message: LiveServerMessage) => {
              if (!isMounted) return;
              
              if (message.serverContent?.interrupted) {
                activeSourcesRef.current.forEach(s => {
                  try { s.stop(); } catch (e) {}
                });
                activeSourcesRef.current = [];
                if (audioContextRef.current) {
                  nextPlayTimeRef.current = audioContextRef.current.currentTime;
                }
              }
              
              // Handle transcriptions if available
              const serverContent = message.serverContent as any;
              
              if (serverContent?.modelTurn?.parts) {
                const textPart = serverContent.modelTurn.parts.find((p: any) => p.text);
                if (textPart && textPart.text) {
                  // Append to the last model message or create a new one
                  const lastMsg = transcriptRef.current[transcriptRef.current.length - 1];
                  if (lastMsg && lastMsg.role === 'model') {
                    lastMsg.text += textPart.text;
                  } else {
                    transcriptRef.current.push({ role: 'model', text: textPart.text });
                  }
                }
              }
              
              // Handle inputTranscription / outputTranscription if they exist
              if (serverContent?.inputTranscription) {
                const text = serverContent.inputTranscription.parts?.[0]?.text;
                if (text && !text.includes("Please start the conversation by saying exactly this:")) {
                  const lastMsg = transcriptRef.current[transcriptRef.current.length - 1];
                  if (lastMsg && lastMsg.role === 'user') {
                    lastMsg.text += text;
                  } else {
                    transcriptRef.current.push({ role: 'user', text });
                  }
                }
              }
              
              if (serverContent?.outputTranscription) {
                const text = serverContent.outputTranscription.parts?.[0]?.text;
                if (text) {
                  const lastMsg = transcriptRef.current[transcriptRef.current.length - 1];
                  if (lastMsg && lastMsg.role === 'model') {
                    // Avoid duplicating if modelTurn also has text
                    if (!lastMsg.text.includes(text)) {
                      lastMsg.text += text;
                    }
                  } else {
                    transcriptRef.current.push({ role: 'model', text });
                  }
                }
              }
              
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && audioContextRef.current) {
                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                const audioBuffer = audioContextRef.current.createBuffer(1, bytes.length / 2, 24000);
                const channelData = audioBuffer.getChannelData(0);
                const dataView = new DataView(bytes.buffer);
                for (let i = 0; i < channelData.length; i++) {
                  channelData[i] = dataView.getInt16(i * 2, true) / 0x7FFF;
                }
                
                const playSource = audioContextRef.current.createBufferSource();
                playSource.buffer = audioBuffer;
                playSource.connect(audioContextRef.current.destination);
                
                if (nextPlayTimeRef.current < audioContextRef.current.currentTime) {
                  nextPlayTimeRef.current = audioContextRef.current.currentTime;
                }
                playSource.start(nextPlayTimeRef.current);
                nextPlayTimeRef.current += audioBuffer.duration;
                
                activeSourcesRef.current.push(playSource);
                playSource.onended = () => {
                  activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== playSource);
                };
              }
            },
            onclose: () => {
              if (isMounted) {
                setIsConnected(false);
                handleEnd();
              }
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              if (isMounted) setError("Connection error occurred");
            }
          }
        });
        
        sessionRef.current = sessionPromise;
        
      } catch (err: any) {
        console.error("Failed to init Live API:", err);
        if (isMounted) {
          setError(err.message || "Failed to access microphone or connect to AI");
          setIsConnecting(false);
        }
      }
    };
    
    initLiveAPI();
    
    return () => {
      isMounted = false;
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
          try { session.close(); } catch (e) {}
        });
      }
    };
  }, [systemInstruction, onEnd]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center">
        <p>{error}</p>
        <button onClick={handleEnd} className="mt-2 px-4 py-2 bg-red-100 rounded-lg text-sm font-medium">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-secondary/30 rounded-2xl border border-border h-full">
      <div className="relative mb-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 ${isConnecting ? 'bg-primary/20' : isConnected ? (isMuted ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600') : 'bg-secondary'}`}>
          {isConnecting ? (
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          ) : isMuted ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </div>
        {isConnected && !isMuted && (
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20" />
        )}
      </div>
      
      <h3 className="text-xl font-semibold mb-2">
        {isConnecting ? 'Connecting to Patient...' : isConnected ? 'Voice Consultation Active' : 'Disconnected'}
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        {isConnecting 
          ? 'Please wait while we establish a secure connection...' 
          : 'Speak clearly into your microphone. The virtual patient will listen and respond in real-time.'}
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          disabled={!isConnected}
          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${isMuted ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        
        <button
          onClick={() => {
            if (sessionRef.current) {
              sessionRef.current.then((s: any) => {
                try { s.close(); } catch (e) {}
              });
            }
            handleEnd();
          }}
          className="px-6 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-medium transition-all flex items-center gap-2"
        >
          <PhoneOff className="w-5 h-5" />
          End Consultation
        </button>
      </div>
    </div>
  );
}
