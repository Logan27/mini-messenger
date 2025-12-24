import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '@/lib/avatar-utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  Settings,
  Moon,
  Sun,
  LogOut,
  Shield,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const MainMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = () => {
    if (!user || !user.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  };

  const isAdmin = user?.role === 'admin';
  const isDark = theme === 'dark';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-card">
        <SheetHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-accent/5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={getAvatarUrl(user?.avatar || user?.profilePicture)} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{user?.username}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Main menu for navigation and settings
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col">
          <Separator />

          <div className="flex flex-col py-2">
            <Button
              variant="ghost"
              className="justify-start gap-3 px-6 py-3 h-auto text-base font-normal"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col py-2">
            <div
              role="button"
              tabIndex={0}
              className="flex items-center justify-between gap-3 px-6 py-3 text-base font-normal cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors w-full"
              onClick={toggleTheme}
              onKeyDown={(e) => e.key === 'Enter' && toggleTheme()}
            >
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span>Night Mode</span>
              </div>
              {/* Visual-only switch indicator to avoid button-in-button nesting */}
              <div
                className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${isDark ? 'bg-primary' : 'bg-input'
                  }`}
              >
                <div
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </div>
            </div>
          </div>

          <Separator />

          {isAdmin && (
            <>
              <div className="flex flex-col py-2">
                <Button
                  variant="ghost"
                  className="justify-start gap-3 px-6 py-3 h-auto text-base font-normal text-blue-600 dark:text-blue-400"
                  onClick={() => handleNavigation('/admin')}
                >
                  <Shield className="h-5 w-5" />
                  <span>Admin Dashboard</span>
                </Button>
              </div>
              <Separator />
            </>
          )}

          <div className="flex flex-col py-2">
            <Button
              variant="ghost"
              className="justify-start gap-3 px-6 py-3 h-auto text-base font-normal text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
