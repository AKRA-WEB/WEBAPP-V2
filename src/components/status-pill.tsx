type StatusPillProps = {
  children: React.ReactNode;
  tone: "blue" | "green" | "slate";
};

export function StatusPill({ children, tone }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
