import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface AudioButtonProps {
  textToSpeak: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  textToSpeak,
  label = 'گوش کن',
  size = 'md',
  className = '',
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return audioEngine.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  const handleClick = () => {
    audioEngine.play('uiTap');
    audioEngine.speakPersian(textToSpeak);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`پخش صدای راهنما: ${label}`}
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 bg-[#4ABAF5] hover:bg-[#34AEEB] border-b-4 border-[#228BC3] active:border-b-0 active:translate-y-0.5 text-white shadow-xs shrink-0 ${
        size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
      } ${className}`}
    >
      <Volume2 className={`w-5 h-5 shrink-0 ${isSpeaking ? 'animate-pulse text-amber-200' : ''}`} />
      <span>{label}</span>
    </button>
  );
};
