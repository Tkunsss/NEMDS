import { OverlayView } from '@react-google-maps/api';

function getMarkerAppearance(kind) {
  switch (kind) {
    case 'driver':
      return {
        text: '🚑',
        fontSize: '24px'
      };
    case 'dispatcher':
      return {
        text: '🏥',
        fontSize: '22px'
      };
    case 'caller':
      return {
        text: '📍',
        fontSize: '20px'
      };
    default:
      return {
        text: '📍',
        fontSize: '20px'
      };
  }
}

export default function MapMarker({ position, title, zIndex, kind = 'default' }) {
  if (!position) return null;

  const { text, fontSize } = getMarkerAppearance(kind);

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -height
      })}
    >
      <div
        title={title}
        aria-label={title}
        role="img"
        style={{
          fontSize,
          lineHeight: 1,
          transform: 'translateY(2px)',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex
        }}
      >
        {text}
      </div>
    </OverlayView>
  );
}
