import { cn } from "@/lib/utils";

const PageHeader = ({
  title,
  description,
  icon,
  actions,
  className
}) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", className)}>
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
    {actions && (
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}
      </div>
    )}
  </div>
);

export { PageHeader };
