import { Marker } from '@react-google-maps/api';

export default function MapMarker({ position, title, zIndex, kind = 'default' }) {
  if (!position) return null;

  return (
    <Marker
      position={position}
      title={title}
      zIndex={zIndex}
      icon={kind === 'driver' ? undefined : undefined}
    />
  );
}
