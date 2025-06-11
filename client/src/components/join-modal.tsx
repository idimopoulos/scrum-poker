import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Club } from "lucide-react";

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (name: string) => void;
  roomId: string;
}

export default function JoinModal({ isOpen, onClose, onJoin, roomId }: JoinModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Club className="h-8 w-8 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl">Join Planning Session</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm mt-1">Enter your name to start voting</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm text-slate-600 block mb-2">Your Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Join Room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
