import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Breadcrumb = ({ items, className }) => (
  <nav
    aria-label="Breadcrumb"
    className={cn("flex items-center space-x-1 text-sm text-muted-foreground mb-4", className)}
  >
    <Link
      to="/"
      className="hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
      aria-label="Home"
    >
      <Home className="w-4 h-4" />
    </Link>
    {items.map((item, index) => (
      <div key={item.href || item.label} className="flex items-center">
        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
        {item.href ? (
          <Link
            to={item.href}
            className="hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
          >
            {item.label}
          </Link>
        ) : (
          <span className="text-foreground font-medium px-1">{item.label}</span>
        )}
      </div>
    ))}
  </nav>
);

export { Breadcrumb };
