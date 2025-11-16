import { BookOpen, Upload, MessageSquare, NotebookPen, TrendingUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const links = [
    { to: "/", label: "Home", icon: BookOpen },
    { to: "/curriculum", label: "Curriculum", icon: Upload },
    { to: "/chat", label: "Ask Jamont", icon: MessageSquare },
    { to: "/notebook", label: "Notebook", icon: NotebookPen },
    { to: "/progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:top-0 md:bottom-auto md:border-b md:border-t-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-around md:justify-start md:gap-8 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50"
              activeClassName="text-primary bg-primary/10 font-medium"
            >
              <link.icon className="w-5 h-5" />
              <span className="text-xs md:text-sm">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
