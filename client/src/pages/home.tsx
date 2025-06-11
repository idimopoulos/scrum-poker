import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Club } from "lucide-react";

interface RoomSettings {
  name: string;
  votingSystem: string;
  timeUnits: string;
  dualVoting: boolean;
  autoReveal: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    name: "Planning Session",
    votingSystem: "fibonacci",
    timeUnits: "hours",
    dualVoting: true,
    autoReveal: false,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (settings: RoomSettings) => {
      const response = await apiRequest("POST", "/api/rooms", settings);
      return response.json();
    },
    onSuccess: (room) => {
      toast({
        title: "Room Created",
        description: `Room ${room.id} has been created successfully.`,
      });
      setLocation(`/room/${room.id}?creator=true`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate(roomSettings);
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room ID.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/room/${joinRoomId.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Club className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Scrum Poker</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Plan and estimate your team's work with collaborative voting
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Room */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Room</CardTitle>
              <CardDescription>
                Set up a new planning session with custom settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomSettings.name}
                  onChange={(e) =>
                    setRoomSettings({ ...roomSettings, name: e.target.value })
                  }
                  placeholder="Planning Session"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="votingSystem">Voting System</Label>
                <Select
                  value={roomSettings.votingSystem}
                  onValueChange={(value) =>
                    setRoomSettings({ ...roomSettings, votingSystem: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13, 21, ?)</SelectItem>
                    <SelectItem value="tshirt">T-Shirt Sizes (XS, S, M, L, XL, XXL, ?)</SelectItem>
                    <SelectItem value="custom">Custom (1-10, ?)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeUnits">Time Units</Label>
                <Select
                  value={roomSettings.timeUnits}
                  onValueChange={(value) =>
                    setRoomSettings({ ...roomSettings, timeUnits: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="dualVoting">Dual Voting Mode</Label>
                <Switch
                  id="dualVoting"
                  checked={roomSettings.dualVoting}
                  onCheckedChange={(checked) =>
                    setRoomSettings({ ...roomSettings, dualVoting: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoReveal">Auto-reveal when all voted</Label>
                <Switch
                  id="autoReveal"
                  checked={roomSettings.autoReveal}
                  onCheckedChange={(checked) =>
                    setRoomSettings({ ...roomSettings, autoReveal: checked })
                  }
                />
              </div>

              <Button
                onClick={handleCreateRoom}
                className="w-full"
                disabled={createRoomMutation.isPending}
              >
                {createRoomMutation.isPending ? "Creating..." : "Create Room"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card>
            <CardHeader>
              <CardTitle>Join Existing Room</CardTitle>
              <CardDescription>
                Enter a room code to join an existing planning session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomId">Room Code</Label>
                <Input
                  id="roomId"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="text-center font-mono text-lg tracking-wider"
                />
              </div>

              <Button onClick={handleJoinRoom} className="w-full" size="lg">
                Join Room
              </Button>

              <Separator />

              <div className="text-center text-sm text-slate-600">
                <p>Don't have a room code?</p>
                <p>Ask your team lead to share the room link or create a new room above.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Club className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Easy Voting</h3>
            <p className="text-sm text-slate-600">
              Quick and intuitive card-based voting for story points and time estimation
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 bg-green-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Real-time Sync</h3>
            <p className="text-sm text-slate-600">
              See votes and updates from your team members in real-time
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 text-purple-600">📊</div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Vote History</h3>
            <p className="text-sm text-slate-600">
              Track all your votes with detailed statistics and averages
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
