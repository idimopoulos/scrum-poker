import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export default function ShareModal({ isOpen, onClose, roomId }: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const shareLink = `${window.location.origin}/room/${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Room link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent("Join our Scrum Planning Session");
    const body = encodeURIComponent(
      `Hi,\n\nYou're invited to join our planning session!\n\nRoom Code: ${roomId}\nDirect Link: ${shareLink}\n\nJust click the link or enter the room code to get started.\n\nSee you there!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Share Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-slate-600 block mb-2">Room Link</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={shareLink}
                readOnly
                className="flex-1 text-sm bg-slate-50"
              />
              <Button onClick={handleCopyLink} size="sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-sm text-slate-600 block mb-2">Room Code</Label>
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg">
                {roomId}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleEmailShare}
              variant="outline"
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
