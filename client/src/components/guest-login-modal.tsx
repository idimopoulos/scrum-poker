import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GuestLoginModalProps {
  children: React.ReactNode;
}

export default function GuestLoginModal({ children }: GuestLoginModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const guestLoginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch("/api/guest-login", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged in as guest. You can now create rooms.",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Failed",
        description: "Invalid password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter the password.",
        variant: "destructive",
      });
      return;
    }
    guestLoginMutation.mutate(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Guest Access</span>
          </DialogTitle>
          <DialogDescription>
            Enter the access password to create and manage rooms as a guest.
            This password is required for room creation only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Access Password</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={guestLoginMutation.isPending}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={guestLoginMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={guestLoginMutation.isPending}
            >
              {guestLoginMutation.isPending ? "Authenticating..." : "Continue as Guest"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}