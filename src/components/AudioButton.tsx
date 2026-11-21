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
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 bg-sky-100 hover:bg-sky-200 text-sky-900 dark:bg-sky-900/50 dark:hover:bg-sky-900/70 dark:text-sky-100 shrink-0 ${
        size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
      } ${className}`}
    >
      <Volume2 className={`w-5 h-5 shrink-0 ${isSpeaking ? 'animate-pulse text-blue-600 dark:text-blue-300' : ''}`} />
      <span>{label}</span>
    </button>
  );
};
