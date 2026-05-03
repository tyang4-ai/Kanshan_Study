interface PushpinProps {
  color?: string;
  size?: number;
}

export function Pushpin({ color = '#1772F6', size = 14 }: PushpinProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ display: 'block', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.35))' }}>
      <ellipse cx="7" cy="8" rx="5" ry="4.6" fill={color}/>
      <ellipse cx="5.5" cy="6.5" rx="2" ry="1.6" fill="rgba(255,255,255,.55)"/>
      <ellipse cx="7" cy="11" rx="3.5" ry="0.6" fill="rgba(0,0,0,.25)"/>
    </svg>
  );
}
