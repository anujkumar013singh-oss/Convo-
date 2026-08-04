import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export default function useWebRTC(socket, { onIceCandidate, onOffer, onAnswer, onConnected }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [connectionState, setConnectionState] = useState('new');

  const peerConnectionRef = useRef(null);

  // STUN & optional TURN Configuration
  const getIceServers = () => {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: import.meta.env.VITE_TURN_USERNAME || '',
        credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
      });
    }

    return iceServers;
  };

  // Stop media tracks & close peer connection completely
  const cleanupWebRTC = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch { /* ignore track stop errors */ }
      });
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch { /* ignore track stop errors */ }
      });
      setRemoteStream(null);
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch { /* ignore close errors */ }
      peerConnectionRef.current = null;
    }

    setIsAudioMuted(false);
    setIsVideoDisabled(false);
    setConnectionState('new');
  }, [localStream, remoteStream]);

  // Initialize Media Stream (Requested ONLY on call start/accept)
  const startLocalStream = useCallback(async (callType = 'audio') => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[WebRTC] getUserMedia permission error:', err);
      toast.error('Camera/Microphone permission denied or device not found.');
      return null;
    }
  }, []);

  // Initialize Peer Connection
  const createPeerConnection = useCallback((callId, targetUserId, stream) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch { /* ignore close error */ }
    }

    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 10,
    });
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle remote tracks arriving
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(incomingStream);
    };

    // Monitor Connection State
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'connected') {
        onConnected?.();
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate({ callId, candidate: event.candidate, toUserId: targetUserId });
      }
    };

    return pc;
  }, [onIceCandidate, onConnected]);

  // Create WebRTC SDP Offer (Caller)
  const createOffer = useCallback(async (callId, targetUserId, stream) => {
    const pc = createPeerConnection(callId, targetUserId, stream);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      if (onOffer) {
        onOffer({ callId, sdp: offer, toUserId: targetUserId });
      }
    } catch (err) {
      console.error('[WebRTC] Create offer error:', err);
    }
  }, [createPeerConnection, onOffer]);

  // Create WebRTC SDP Answer (Callee)
  const createAnswer = useCallback(async (callId, targetUserId, offerSdp, stream) => {
    const pc = createPeerConnection(callId, targetUserId, stream);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (onAnswer) {
        onAnswer({ callId, sdp: answer, toUserId: targetUserId });
      }
    } catch (err) {
      console.error('[WebRTC] Create answer error:', err);
    }
  }, [createPeerConnection, onAnswer]);

  // Handle incoming Answer
  const handleRemoteAnswer = useCallback(async (answerSdp) => {
    if (peerConnectionRef.current && answerSdp) {
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
      } catch (err) {
        console.error('[WebRTC] Set remote answer error:', err);
      }
    }
  }, []);

  // Handle incoming ICE Candidate
  const handleRemoteIceCandidate = useCallback(async (candidate) => {
    if (peerConnectionRef.current && candidate) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] Add ICE candidate error:', err);
      }
    }
  }, []);

  // Mute / Unmute Microphone
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsAudioMuted((prev) => !prev);
    }
  }, [localStream]);

  // Toggle Video Camera
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoDisabled((prev) => !prev);
    }
  }, [localStream]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      cleanupWebRTC();
    };
  }, [cleanupWebRTC]);

  return {
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoDisabled,
    connectionState,
    startLocalStream,
    createOffer,
    createAnswer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    toggleAudio,
    toggleVideo,
    cleanupWebRTC,
  };
}
