import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="cyber-panel corner-cuts p-10 text-center flex flex-col items-center gap-3">
      {icon && <div className="text-neon-cyan">{icon}</div>}
      <h3 className="font-display text-xl neon-text-cyan">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      {action}
    </div>
  );
}
