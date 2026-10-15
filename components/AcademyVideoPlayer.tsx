"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import styles from "./AcademyVideoPlayer.module.css";

type Props = { src: string; title: string };
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function AcademyVideoPlayer(props: Props) {
  return <Player key={props.src} {...props} />;
}

function Player({ src, title }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const media = video.current;
    if (!media) return;
    const syncMetadata = () => {
      if (Number.isFinite(media.duration)) setDuration(media.duration);
    };
    syncMetadata();
    media.addEventListener("loadedmetadata", syncMetadata);
    media.muted = true;
    // Some browsers need the muted property set before requesting autoplay.
    void media.play().catch(() => { /* Keep the play button if autoplay is blocked. */ });
    return () => media.removeEventListener("loadedmetadata", syncMetadata);
  }, []);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function play() {
    try { await video.current?.play(); setError(""); }
    catch { setError("Playback could not start. Please try again."); }
  }
  function togglePlay() {
    if (video.current?.paused) void play(); else video.current?.pause();
  }
  function toggleSound() {
    if (!video.current) return;
    video.current.muted = !video.current.muted;
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === frame.current) await document.exitFullscreen();
      else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen();
      else {
        const media = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        media?.webkitEnterFullscreen?.();
      }
    } catch { setError("Fullscreen is unavailable in this browser."); }
  }

  return <div ref={frame} className={styles.player} role="region" aria-label={`${title} video player`}>
    <video ref={video} className={styles.video} src={src} autoPlay muted loop playsInline preload="metadata"
      aria-label={`${title} introduction video`}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onVolumeChange={event => setMuted(event.currentTarget.muted)}
      onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)}
      onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onError={() => setError("This video could not load. Please try opening it below.")}
    />
    <button type="button" className={styles.sound} onClick={toggleSound} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Sound off" : "Sound on"}
    </button>
    {!playing && !error && <button type="button" className={styles.bigPlay} onClick={() => void play()} aria-label={`Play ${title}`}><Play size={30} fill="currentColor" /></button>}
    {error && <div className={styles.error} role="alert">{error} <a href={src} target="_blank" rel="noopener noreferrer">Open video ↗</a></div>}
    <div className={styles.controls}>
      <input className={styles.seek} type="range" min={0} max={duration || 1} step={0.1} value={Math.min(elapsed, duration || 1)} disabled={!duration}
        aria-label="Seek video" aria-valuetext={`${time(elapsed)} of ${time(duration)}`}
        onChange={event => { if (video.current) { video.current.currentTime = Number(event.target.value); setElapsed(Number(event.target.value)); } }} />
      <div className={styles.row}>
        <button type="button" onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"}>{playing ? <Pause size={19} /> : <Play size={19} />}</button>
        <button type="button" onClick={() => { if (video.current) { video.current.currentTime = 0; void play(); } }} aria-label="Restart video"><RotateCcw size={17} /></button>
        <span className={styles.time}>{time(elapsed)} / {time(duration)}</span>
        <span className={styles.spacer} />
        <select aria-label="Playback speed" value={speed} onChange={event => { const value = Number(event.target.value); if (video.current) video.current.playbackRate = value; setSpeed(value); }}>
          {[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
        </select>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
      </div>
    </div>
  </div>;
}
