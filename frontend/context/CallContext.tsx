'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'in-call';

interface CallContextValue {
  status: CallStatus;
  peerNombre: string | null;
  muted: boolean;
  errorMessage: string | null;
  callDuration: number;
  startCall: (toId: string, toNombre: string) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [peerNombre, setPeerNombre] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const statusRef = useRef<CallStatus>('idle');
  const peerIdRef = useRef<string | null>(null);
  const myIdRef = useRef<string>('');
  const myNombreRef = useRef<string>('');

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { myIdRef.current = user?.id ?? ''; myNombreRef.current = user?.nombre ?? ''; }, [user?.id, user?.nombre]);

  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const startDurationTimer = () => {
    stopDurationTimer();
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const getLocalStream = async () => {
    if (!localStreamRef.current) {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    return localStreamRef.current;
  };

  const cleanup = useCallback(() => {
    stopDurationTimer();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    pendingCandidatesRef.current = [];
    peerIdRef.current = null;
    setPeerNombre(null);
    setMuted(false);
    setCallDuration(0);
    setStatus('idle');
  }, []);

  const createPeerConnection = useCallback((toId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc_ice_candidate', {
          from_id: myIdRef.current,
          to_id: toId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup]);

  useEffect(() => {
    if (!user?.id) return;

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', user.id);
    });

    socket.on('incoming_call', (data: any) => {
      const fromId = data?.from_id?.toString();
      if (!fromId) return;

      if (statusRef.current !== 'idle') {
        socket.emit('call_reject', { from_id: user.id, to_id: fromId, reason: 'busy' });
        return;
      }

      peerIdRef.current = fromId;
      setPeerNombre(data?.from_nombre ?? null);
      setErrorMessage(null);
      setStatus('ringing');
    });

    socket.on('call_accepted', async (data: any) => {
      const fromId = data?.from_id?.toString();
      const to = peerIdRef.current;
      if (statusRef.current !== 'calling' || !to || to !== fromId) return;

      try {
        const stream = await getLocalStream();
        const pc = createPeerConnection(to);
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { from_id: myIdRef.current, to_id: to, sdp: offer });

        setStatus('in-call');
        startDurationTimer();
      } catch {
        setErrorMessage('No se pudo iniciar el audio de la llamada. Verifica el permiso del micrófono.');
        socket.emit('call_end', { from_id: myIdRef.current, to_id: to });
        cleanup();
      }
    });

    socket.on('call_rejected', (data: any) => {
      if (peerIdRef.current !== data?.from_id?.toString()) return;
      setErrorMessage('La llamada fue rechazada.');
      cleanup();
    });

    socket.on('call_cancelled', (data: any) => {
      if (peerIdRef.current !== data?.from_id?.toString()) return;
      cleanup();
    });

    socket.on('call_ended', (data: any) => {
      if (peerIdRef.current !== data?.from_id?.toString()) return;
      cleanup();
    });

    socket.on('webrtc_offer', async (data: any) => {
      const fromId = data?.from_id?.toString();
      const to = peerIdRef.current;
      if (!to || to !== fromId) return;

      try {
        const pc = createPeerConnection(to);
        const stream = await getLocalStream();
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { from_id: myIdRef.current, to_id: to, sdp: answer });
      } catch {
        setErrorMessage('Error al procesar la llamada.');
      }
    });

    socket.on('webrtc_answer', async (data: any) => {
      const fromId = data?.from_id?.toString();
      if (peerIdRef.current !== fromId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const candidate of pendingCandidatesRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
      } catch {
        // ignora candidatos/SDP inválidos tardíos
      }
    });

    socket.on('webrtc_ice_candidate', async (data: any) => {
      const fromId = data?.from_id?.toString();
      if (peerIdRef.current !== fromId) return;
      try {
        const candidate = data.candidate as RTCIceCandidateInit;
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch {
        // ignora candidatos inválidos
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, cleanup, createPeerConnection]);

  const startCall = useCallback((toId: string, toNombre: string) => {
    if (statusRef.current !== 'idle') return;
    setErrorMessage(null);
    peerIdRef.current = toId;
    setPeerNombre(toNombre);
    setStatus('calling');
    socketRef.current?.emit('call_invite', {
      from_id: myIdRef.current,
      to_id: toId,
      from_nombre: myNombreRef.current,
    });
  }, []);

  const acceptCall = useCallback(async () => {
    const to = peerIdRef.current;
    if (!to) return;
    try {
      await getLocalStream();
      setStatus('in-call');
      startDurationTimer();
      socketRef.current?.emit('call_accept', { from_id: myIdRef.current, to_id: to });
    } catch {
      setErrorMessage('No se pudo acceder al micrófono.');
      socketRef.current?.emit('call_reject', { from_id: myIdRef.current, to_id: to, reason: 'no_mic' });
      cleanup();
    }
  }, [cleanup]);

  const rejectCall = useCallback(() => {
    const to = peerIdRef.current;
    if (to) socketRef.current?.emit('call_reject', { from_id: myIdRef.current, to_id: to });
    cleanup();
  }, [cleanup]);

  const hangUp = useCallback(() => {
    const to = peerIdRef.current;
    if (to) {
      if (statusRef.current === 'calling') {
        socketRef.current?.emit('call_cancel', { from_id: myIdRef.current, to_id: to });
      } else if (statusRef.current === 'in-call') {
        socketRef.current?.emit('call_end', { from_id: myIdRef.current, to_id: to });
      } else if (statusRef.current === 'ringing') {
        socketRef.current?.emit('call_reject', { from_id: myIdRef.current, to_id: to });
      }
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setMuted((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((track) => { track.enabled = !next; });
      return next;
    });
  }, []);

  return (
    <CallContext.Provider
      value={{ status, peerNombre, muted, errorMessage, callDuration, startCall, acceptCall, rejectCall, hangUp, toggleMute }}
    >
      {children}
      <audio ref={remoteAudioRef} autoPlay hidden />
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall debe usarse dentro de un CallProvider');
  return ctx;
};
