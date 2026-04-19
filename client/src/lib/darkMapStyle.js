// Dark map style (Google Maps JSON style array)
// Tune freely; this is a compact "dark mode" baseline.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1f21' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1f21' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8d91' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#3c4043' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8d91' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#15181a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2b2f33' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1d1f21' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8d91' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2b2f33' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f1418' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#536b7a' }],
  },
];

