import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EmptyState = ({
  icon: Icon = FileText,
  title,
  description,
  action,
  className,
}) => (
  <div className={cn("text-center py-12 px-4", className)}>
    <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
    {description && (
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
    )}
    {action && (
      action.to ? (
        <Link to={action.to}>
          <Button>{action.label}</Button>
        </Link>
      ) : (
        <Button onClick={action.onClick}>{action.label}</Button>
      )
    )}
  </div>
);

export { EmptyState };
