import React from 'react';
import { getInitials, getColorForName } from '../../utils/avatar';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-medium',
  lg: 'w-14 h-14 text-base font-semibold',
  xl: 'w-20 h-20 text-xl font-bold',
};

export const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, size = 'md', className = '' }) => {
  const [imgError, setImgError] = React.useState(false);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 shrink-0 ${className}`}
      />
    );
  }

  const bgColor = getColorForName(name);
  const initials = getInitials(name);

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`${sizeClasses[size]} rounded-full text-white flex items-center justify-center shrink-0 border border-black/5 select-none ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
