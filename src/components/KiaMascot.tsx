import React from 'react';
import { KiaAvatar, KIA_ICON_PATHS, type KiaAvatarProps } from './KiaAvatar';

export const KIA_IMAGE_PATH = KIA_ICON_PATHS.idle;

export type KiaMascotProps = KiaAvatarProps;

/**
 * Wrapper around KiaAvatar so all existing screens automatically use
 * the fast optimized Kia emotion icons (idle, happy, cheering, sad, teaching).
 */
export const KiaMascot: React.FC<KiaMascotProps> = (props) => {
  return <KiaAvatar {...props} />;
};
