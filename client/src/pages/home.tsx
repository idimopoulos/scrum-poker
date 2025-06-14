import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Club, Users, Clock, BarChart3, LogIn } from "lucide-react";
import AuthHeader from "@/components/auth-header";
import LoginForm from "@/components/login-form";

interface RoomSettings {
  name: string;
  voteForStoryPoints: boolean;
  voteForTime: boolean;
  storyPointsSystem: string;
  storyPointsValues: string;
  timeUnits: string;
  timeValues: string;
  autoReveal: boolean;
}



export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    name: "Planning Session",
    voteForStoryPoints: true,
    voteForTime: true,
    storyPointsSystem: "fibonacci",
    storyPointsValues: "1, 2, 3, 5, 8, 13, 21, ?",
    timeUnits: "hours",
    timeValues: "1, 2, 4, 8, 12, 16, 20, 24, 32, 40, ?",
    autoReveal: false,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (settings: RoomSettings) => {
      // Convert the new format to the backend format
      const backendSettings = {
        name: settings.name,
        votingSystem: settings.voteForStoryPoints ? settings.storyPointsSystem : "fibonacci",
        timeUnits: settings.voteForTime ? settings.timeUnits : "hours",
        dualVoting: settings.voteForStoryPoints && settings.voteForTime,
        autoReveal: settings.autoReveal,
        storyPointValues: settings.voteForStoryPoints 
          ? settings.storyPointsValues.split(',').map(v => v.trim()).filter(v => v)
          : [],
        timeValues: settings.voteForTime 
          ? settings.timeValues.split(',').map(v => v.trim()).filter(v => v)
          : []
      };
      const response = await apiRequest("POST", "/api/rooms", backendSettings);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🃏</span>
                </div>
                <h1 className="text-xl font-semibold text-slate-800">Scrum Poker</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Plan Better,
              <span className="text-primary"> Estimate Smarter</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Real-time Scrum poker for agile teams. Streamline your planning sessions with 
              collaborative estimation, dual voting systems, and comprehensive analytics.
            </p>
            
            <div className="max-w-md mx-auto mb-12">
              <LoginForm onSuccess={() => window.location.reload()} />
            </div>

            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  const roomId = prompt("Enter room ID to join:");
                  if (roomId) window.location.href = `/room/${roomId}`;
                }}
              >
                Join Existing Room as Guest
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Real-time Collaboration</h3>
                <p className="text-slate-600">
                  Vote simultaneously with your team. See results update in real-time with automatic fallback to polling.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dual Voting System</h3>
                <p className="text-slate-600">
                  Estimate both story points and time. Customize voting systems to match your team's workflow.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Comprehensive Analytics</h3>
                <p className="text-slate-600">
                  Track voting history, analyze consensus patterns, and improve estimation accuracy over time.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Club className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-800">Scrum Poker</h1>
            </div>
            <AuthHeader />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Your Planning Session</h1>
          <p className="text-slate-600 text-lg">
            Set up a new room with custom settings for your team's estimation needs
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

              <div className="space-y-4">
                <Label className="text-base font-medium">Vote for:</Label>
                
                {/* Story Points Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="voteForStoryPoints"
                      checked={roomSettings.voteForStoryPoints}
                      onCheckedChange={(checked) =>
                        setRoomSettings({ ...roomSettings, voteForStoryPoints: !!checked })
                      }
                    />
                    <Label htmlFor="voteForStoryPoints">Story points (complexity)</Label>
                  </div>
                  
                  {roomSettings.voteForStoryPoints && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="storyPointsSystem" className="text-sm">Voting System</Label>
                      <Select
                        value={roomSettings.storyPointsSystem}
                        onValueChange={(value) => {
                          let defaultValues = "1, 2, 3, 5, 8, 13, 21, ?";
                          if (value === "tshirt") {
                            defaultValues = "XS, S, M, L, XL, XXL, ?";
                          } else if (value === "custom") {
                            defaultValues = "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?";
                          }
                          setRoomSettings({ 
                            ...roomSettings, 
                            storyPointsSystem: value,
                            storyPointsValues: defaultValues
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fibonacci">Fibonacci</SelectItem>
                          <SelectItem value="tshirt">T-Shirt Sizes</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="space-y-1">
                        <Label htmlFor="storyPointsValues" className="text-sm text-slate-600">Values</Label>
                        <Textarea
                          id="storyPointsValues"
                          value={roomSettings.storyPointsValues}
                          onChange={(e) =>
                            setRoomSettings({ ...roomSettings, storyPointsValues: e.target.value })
                          }
                          disabled={roomSettings.storyPointsSystem !== "custom"}
                          className="h-16 text-sm"
                          placeholder="Enter values separated by commas"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Estimation Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="voteForTime"
                      checked={roomSettings.voteForTime}
                      onCheckedChange={(checked) =>
                        setRoomSettings({ ...roomSettings, voteForTime: !!checked })
                      }
                    />
                    <Label htmlFor="voteForTime">Time</Label>
                  </div>
                  
                  {roomSettings.voteForTime && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="timeUnits" className="text-sm">Time Units</Label>
                      <Select
                        value={roomSettings.timeUnits}
                        onValueChange={(value) => {
                          let defaultValues = "1, 2, 4, 8, 12, 16, 20, 24, 32, 40, ?";
                          if (value === "days") {
                            defaultValues = "0.5, 1, 1.5, 2, 2.5, 3, 5, ?";
                          }
                          setRoomSettings({ 
                            ...roomSettings, 
                            timeUnits: value,
                            timeValues: defaultValues
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="space-y-1">
                        <Label htmlFor="timeValues" className="text-sm text-slate-600">Values</Label>
                        <Textarea
                          id="timeValues"
                          value={roomSettings.timeValues}
                          onChange={(e) =>
                            setRoomSettings({ ...roomSettings, timeValues: e.target.value })
                          }
                          className="h-16 text-sm"
                          placeholder="Enter values separated by commas"
                        />
                      </div>
                    </div>
                  )}
                </div>
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
                disabled={createRoomMutation.isPending || (!roomSettings.voteForStoryPoints && !roomSettings.voteForTime)}
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
      </main>
    </div>
  );
}
