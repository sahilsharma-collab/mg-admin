"use client";

import React, { useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

interface VoiceRecorderProps {
  disabled?: boolean;
  // Emits the recorded audio as a File (or null when cleared).
  onChange: (file: File | null) => void;
}

// Static bar heights for the waveform strip (mirrors the native recorder's
// repeated-waveform look).
const BARS = [8, 14, 20, 11, 24, 16, 9, 22, 13, 18, 10, 26, 15, 12, 21, 9, 17, 23, 11, 19, 14, 8, 20, 13];

// In-browser mic recorder (MediaRecorder API, secure-context: https/localhost).
// Styled to resemble the native composer's voice row: a dark pill with a
// round mic/stop button, a mint waveform, and a timer.
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ disabled, onChange }) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `voice-note.${ext}`, { type });
        setAudioUrl(URL.createObjectURL(blob));
        onChange(file);
        stopTracks();
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was denied or is unavailable.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    stopTimer();
  };

  const clear = () => {
    setAudioUrl("");
    setSeconds(0);
    onChange(null);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const active = recording;

  return (
    <div className="space-y-2">
      {/* native-style voice pill */}
      <div className="flex items-center gap-3 rounded-full bg-[#EFEFEF] dark:bg-[#2E2941] border border-[#0000001A] px-3 py-2">
        <button
          type="button"
          disabled={disabled}
          onClick={recording ? stop : start}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors ${
            recording ? "bg-red-500 hover:bg-red-600" : "bg-[#0ABAB5] hover:bg-[#089e99]"
          } disabled:opacity-50`}
          aria-label={recording ? "Stop recording" : "Record"}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* waveform */}
        <div className="flex flex-1 items-center gap-[3px] overflow-hidden h-8">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${
                active ? "bg-[#0ABAB5] animate-pulse" : audioUrl ? "bg-[#0ABAB5]/70" : "bg-gray-400/50"
              }`}
              style={{ height: `${h}px`, animationDelay: `${(i % 6) * 100}ms` }}
            />
          ))}
        </div>

        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {fmt(seconds)}
        </span>

        {audioUrl && !recording && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-muted-foreground hover:text-red-500"
            aria-label="Discard recording"
            title="Discard"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {audioUrl && !recording && (
        <audio controls src={audioUrl} className="w-full max-w-sm" />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default VoiceRecorder;
