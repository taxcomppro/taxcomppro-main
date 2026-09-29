"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  LocalParticipant,
  RemoteTrack,
} from "livekit-client";

interface UseProTalkAudioRecoveryProps {
  room: Room;
  localParticipant?: LocalParticipant;
  isApprovedSpeaker?: boolean;
  isMicrophoneEnabled?: boolean;
  onToast?: (msg: string) => void;
}

export function useProTalkAudioRecovery({
  room,
  localParticipant,
  isApprovedSpeaker = false,
  isMicrophoneEnabled = false,
  onToast,
}: UseProTalkAudioRecoveryProps) {
  const [audioInterrupted, setAudioInterrupted] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const wasMicEnabledRef = useRef(false);
  const isInterruptedRef = useRef(false);
  const retryTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Track if speaker had microphone unmuted prior to interruption
  useEffect(() => {
    if (isApprovedSpeaker && isMicrophoneEnabled) {
      wasMicEnabledRef.current = true;
    } else if (isApprovedSpeaker && !isMicrophoneEnabled) {
      wasMicEnabledRef.current = false;
    }
  }, [isApprovedSpeaker, isMicrophoneEnabled]);

  const clearPendingRetries = useCallback(() => {
    retryTimeoutsRef.current.forEach(clearTimeout);
    retryTimeoutsRef.current = [];
  }, []);

  // Comprehensive audio resumption logic
  const resumeAudio = useCallback(async () => {
    if (room.state !== ConnectionState.Connected) return false;
    setIsResuming(true);

    let succeeded = false;

    try {
      // 1. LiveKit room.startAudio() - starts audio playback and creates/resumes audio context
      await room.startAudio().catch((err) => {
        console.debug("[ProTalk AudioRecovery] room.startAudio caught:", err);
      });

      // 2. Unpause/resume any standard or WebKit AudioContext
      if (typeof window !== "undefined") {
        const anyRoom = room as unknown as { audioContext?: AudioContext };
        if (
          anyRoom.audioContext &&
          (anyRoom.audioContext.state === "suspended" ||
            (anyRoom.audioContext.state as string) === "interrupted")
        ) {
          try {
            await anyRoom.audioContext.resume();
          } catch (ctxErr) {
            console.debug("[ProTalk AudioRecovery] AudioContext resume caught:", ctxErr);
          }
        }
      }

      // 3. Find and play all <audio> elements in the DOM
      if (typeof document !== "undefined") {
        const audioElements = document.querySelectorAll<HTMLAudioElement>("audio");
        audioElements.forEach((el) => {
          try {
            el.muted = false;
            if (el.paused) {
              const playPromise = el.play();
              if (playPromise !== undefined) {
                playPromise.catch((e) => {
                  console.debug("[ProTalk AudioRecovery] Audio element play caught:", e);
                });
              }
            }
          } catch {}
        });
      }

      // 4. Ensure all remote audio tracks are attached and actively playing
      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track && pub.isSubscribed) {
            const track = pub.track as RemoteTrack;
            const attached = track.attachedElements;
            if (!attached || attached.length === 0) {
              try {
                const el = track.attach();
                el.muted = false;
                el.play().catch(() => {});
              } catch {}
            } else {
              attached.forEach((el) => {
                try {
                  el.muted = false;
                  if (el.paused) {
                    el.play().catch(() => {});
                  }
                } catch {}
              });
            }
          }
        });
      });

      // 5. Microphone Auto-Recovery for Speakers/Hosts
      if (isApprovedSpeaker && localParticipant && wasMicEnabledRef.current) {
        try {
          const micPub = localParticipant.getTrackPublication(
            Track.Source.Microphone
          );
          const micTrack = micPub?.track;
          const mediaStreamTrack = micTrack?.mediaStreamTrack;

          // Check if hardware mic track was ended or muted during phone call
          if (
            !mediaStreamTrack ||
            mediaStreamTrack.readyState === "ended" ||
            mediaStreamTrack.muted
          ) {
            console.log(
              "[ProTalk AudioRecovery] Local mic was interrupted by call/system. Restarting microphone..."
            );
            await localParticipant.setMicrophoneEnabled(false);
            await localParticipant.setMicrophoneEnabled(true);
            onToast?.("🎙️ Microphone reconnected after call.");
          }
        } catch (micErr) {
          console.debug("[ProTalk AudioRecovery] Mic re-acquire caught:", micErr);
        }
      }

      // 6. Check if audio is now healthy
      if (room.canPlaybackAudio) {
        setAudioInterrupted(false);
        isInterruptedRef.current = false;
        succeeded = true;
      }
    } catch (err) {
      console.debug("[ProTalk AudioRecovery] Full audio recovery error:", err);
    } finally {
      setIsResuming(false);
    }

    return succeeded;
  }, [room, localParticipant, isApprovedSpeaker, onToast]);

  // Schedule progressive retries after returning from phone call or background
  const triggerDelayedRecovery = useCallback(() => {
    clearPendingRetries();

    // Immediate attempt
    resumeAudio().then((success) => {
      if (!success) {
        setAudioInterrupted(true);
        isInterruptedRef.current = true;
      }
    });

    // Delays: phone dialers often release hardware 200-1500ms after returning
    const delays = [300, 800, 1600, 3000];
    delays.forEach((delay) => {
      const timer = setTimeout(() => {
        resumeAudio().then((success) => {
          if (success) {
            clearPendingRetries();
          } else if (room.remoteParticipants.size > 0) {
            setAudioInterrupted(true);
            isInterruptedRef.current = true;
          }
        });
      }, delay);
      retryTimeoutsRef.current.push(timer);
    });
  }, [clearPendingRetries, resumeAudio, room.remoteParticipants.size]);

  // Listen to AudioPlaybackStatusChanged from LiveKit
  useEffect(() => {
    const handleStatusChange = (canPlayback: boolean) => {
      setAudioInterrupted(!canPlayback);
      isInterruptedRef.current = !canPlayback;
      if (!canPlayback) {
        // Audio playback was blocked, schedule recovery
        triggerDelayedRecovery();
      }
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, handleStatusChange);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, handleStatusChange);
    };
  }, [room, triggerDelayedRecovery]);

  // Listen to OS & Browser Lifecycle Events (visibilitychange, focus, pageshow)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[ProTalk AudioRecovery] Page became visible again. Triggering phone call audio recovery..."
        );
        triggerDelayedRecovery();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        triggerDelayedRecovery();
      }
    };

    const handlePageShow = () => {
      triggerDelayedRecovery();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      clearPendingRetries();
    };
  }, [triggerDelayedRecovery, clearPendingRetries]);

  // Global user gesture catch-all (One-tap unlock after phone call)
  useEffect(() => {
    const handleUserGesture = () => {
      if (isInterruptedRef.current || !room.canPlaybackAudio) {
        resumeAudio();
      }
    };

    // Attach passive capture listeners for any user touch or click
    window.addEventListener("touchstart", handleUserGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener("click", handleUserGesture, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleUserGesture, {
        capture: true,
      });
      window.removeEventListener("click", handleUserGesture, {
        capture: true,
      });
    };
  }, [resumeAudio, room]);

  // Periodic health check: ensure remote audio elements are playing
  useEffect(() => {
    const interval = setInterval(() => {
      if (room.state !== ConnectionState.Connected) return;

      // Check if there are remote participants with active audio
      let hasRemoteAudio = false;
      let hasPausedAudio = false;

      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track && pub.isSubscribed && !pub.isMuted) {
            hasRemoteAudio = true;
            const attached = pub.track.attachedElements;
            if (!attached || attached.length === 0) {
              hasPausedAudio = true;
            } else {
              attached.forEach((el) => {
                if (el.paused) hasPausedAudio = true;
              });
            }
          }
        });
      });

      if (hasRemoteAudio && (!room.canPlaybackAudio || hasPausedAudio)) {
        setAudioInterrupted(true);
        isInterruptedRef.current = true;
      } else if (room.canPlaybackAudio && !hasPausedAudio) {
        setAudioInterrupted(false);
        isInterruptedRef.current = false;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [room]);

  return {
    audioInterrupted,
    isResuming,
    resumeAudio,
  };
}
