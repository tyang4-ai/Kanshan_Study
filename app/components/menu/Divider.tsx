interface DividerProps {
  dim?: boolean;
}

export function Divider({ dim = false }: DividerProps) {
  return (
    <div
      style={{
        height: 1,
        margin: '4px 8px',
        background: dim ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.10)',
      }}
    />
  );
}
