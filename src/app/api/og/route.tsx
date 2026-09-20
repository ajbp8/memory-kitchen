import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#3E7B5A',
          padding: '80px',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, #4A9B6F 0%, #2A5A3E 100%)',
          display: 'flex',
        }} />
        {/* Ring decorations */}
        <div style={{
          position: 'absolute',
          right: 200,
          top: '50%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          border: '2px solid #6AAF88',
          marginTop: -150,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          right: 240,
          top: '50%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '2px solid #6AAF88',
          marginTop: -110,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          right: 280,
          top: '50%',
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: '2px solid #6AAF88',
          marginTop: -70,
          display: 'flex',
        }} />
        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div style={{
            fontSize: 88,
            fontWeight: 700,
            color: '#F3F8F5',
            marginBottom: 16,
            display: 'flex',
          }}>
            Memory Kitchen
          </div>
          <div style={{
            fontSize: 36,
            color: '#D4E8DC',
            display: 'flex',
          }}>
            A recipe sharing network for family and friends.
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
