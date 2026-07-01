'use client';

import { PhoneIcon, PhoneXMarkIcon, MicrophoneIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { useCall } from '@/context/CallContext';

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function CallOverlay() {
  const { status, peerNombre, muted, errorMessage, callDuration, acceptCall, rejectCall, hangUp, toggleMute } = useCall();

  if (status === 'idle') return null;

  const initial = peerNombre?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-namay-navy/60 backdrop-blur-sm animate-fade-in">
      <div className="w-80 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-in">
        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold bg-namay-navy">
            {initial}
          </div>

          <div className="text-center">
            <p className="text-base font-semibold text-namay-navy dark:text-gray-100">
              {peerNombre ?? 'Contacto'}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-namay-steel/60 dark:text-gray-400 mt-1.5">
              {status === 'calling' && 'Llamando...'}
              {status === 'ringing' && 'Llamada entrante'}
              {status === 'in-call' && formatDuration(callDuration)}
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs text-danger-500 text-center">{errorMessage}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            {status === 'ringing' && (
              <>
                <button
                  onClick={rejectCall}
                  title="Rechazar"
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-danger-500 hover:bg-danger-600 text-white transition-colors"
                >
                  <PhoneXMarkIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={acceptCall}
                  title="Contestar"
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-success-500 hover:bg-success-600 text-white transition-colors"
                >
                  <PhoneIcon className="h-6 w-6" />
                </button>
              </>
            )}

            {status === 'calling' && (
              <button
                onClick={hangUp}
                title="Cancelar"
                className="w-14 h-14 rounded-full flex items-center justify-center bg-danger-500 hover:bg-danger-600 text-white transition-colors"
              >
                <PhoneXMarkIcon className="h-6 w-6" />
              </button>
            )}

            {status === 'in-call' && (
              <>
                <button
                  onClick={toggleMute}
                  title={muted ? 'Reactivar micrófono' : 'Silenciar'}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    muted
                      ? 'bg-namay-coral text-white hover:bg-namay-coral/90'
                      : 'bg-gray-100 dark:bg-gray-700 text-namay-navy dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {muted ? <SpeakerXMarkIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
                </button>
                <button
                  onClick={hangUp}
                  title="Colgar"
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-danger-500 hover:bg-danger-600 text-white transition-colors"
                >
                  <PhoneXMarkIcon className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
