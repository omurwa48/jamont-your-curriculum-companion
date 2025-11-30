import { Home, MessageSquare, TrendingUp, User, Brain, BookOpen, FolderOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const Navigation = () => {
  const links = [
    { to: "/", label: "Home", icon: Home },
    { to: "/chat", label: "Jamont", icon: MessageSquare },
    { to: "/curriculum", label: "Library", icon: FolderOpen },
    { to: "/study-tools", label: "Study", icon: Brain },
    { to: "/progress", label: "Progress", icon: TrendingUp },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:top-0 md:bottom-auto md:border-b md:border-t-0 z-50 shadow-lg">
      <div className="container mx-auto px-2">
        <div className="flex justify-around md:justify-start md:gap-2 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="flex flex-col md:flex-row items-center gap-1 px-2 md:px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105"
              activeClassName="text-primary bg-primary/10 font-medium shadow-sm"
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
