import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LoadingState = ({
  variant = 'page',
  text = 'Loading...',
  className
}) => {
  const variants = {
    page: (
      <div className={cn("min-h-screen flex items-center justify-center", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{text}</p>
        </div>
      </div>
    ),
    section: (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    ),
    card: (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    ),
    inline: (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {text && <span className="text-sm">{text}</span>}
      </span>
    ),
    button: (
      <Loader2 className={cn("w-4 h-4 animate-spin", className)} />
    ),
  };

  return variants[variant] || variants.page;
};

export { LoadingState };
