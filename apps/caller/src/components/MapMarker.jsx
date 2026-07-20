import { Marker } from '@react-google-maps/api';

function getMarkerAppearance(kind) {
  switch (kind) {
    case 'driver':
      return {
        label: { text: '🚑', fontSize: '24px' },
        icon: {
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
        }
      };
    case 'dispatcher':
      return {
        label: { text: '🏥', fontSize: '22px' },
        icon: {
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
        }
      };
    case 'caller':
      return {
        label: { text: '📍', fontSize: '20px' },
        icon: {
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
        }
      };
    default:
      return {};
  }
}

export default function MapMarker({ position, title, zIndex, kind = 'default' }) {
  if (!position) return null;

  const markerAppearance = getMarkerAppearance(kind);

  return (
    <Marker
      position={position}
      title={title}
      zIndex={zIndex}
      {...markerAppearance}
    />
  );
}
