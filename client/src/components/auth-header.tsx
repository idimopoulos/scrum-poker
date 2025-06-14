import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function AuthHeader() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.href = '/api/login'}
        className="flex items-center space-x-2"
      >
        <LogIn className="h-4 w-4" />
        <span>Sign In</span>
      </Button>
    );
  }

  const userData = user as any;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={userData?.profileImageUrl || undefined} />
          <AvatarFallback>
            {userData?.firstName ? userData.firstName[0] : userData?.email?.[0] || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block">
          <div className="text-sm font-medium text-slate-800">
            {userData?.firstName || userData?.email?.split('@')[0] || 'User'}
          </div>
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.href = '/api/logout'}
        className="flex items-center space-x-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}