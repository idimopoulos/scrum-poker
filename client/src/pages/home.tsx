import { useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Club, Users, Clock, BarChart3, Plus, ArrowRight } from "lucide-react";

interface RoomSettings {
  name: string;
  creatorName: string;
  voteForStoryPoints: boolean;
  voteForTime: boolean;
  storyPointsSystem: string;
  storyPointsValues: string;
  timeUnits: string;
  timeValues: string;
  autoReveal: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    name: "Planning Session",
    creatorName: "Room Creator",
    voteForStoryPoints: true,
    voteForTime: true,
    storyPointsSystem: "fibonacci",
    storyPointsValues: "1, 2, 3, 5, 8, 13, 21, ?",
    timeUnits: "hours",
    timeValues: "1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, ?",
    autoReveal: true,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (settings: RoomSettings) => {
      const backendSettings = {
        name: settings.name,
        votingSystem: settings.voteForStoryPoints
          ? settings.storyPointsSystem
          : "fibonacci",
        timeUnits: settings.voteForTime ? settings.timeUnits : "hours",
        dualVoting: settings.voteForStoryPoints && settings.voteForTime,
        autoReveal: settings.autoReveal,
        storyPointValues: settings.voteForStoryPoints
          ? settings.storyPointsValues
              .split(",")
              .map((v) => v.trim())
              .filter((v) => v)
          : [],
        timeValues: settings.voteForTime
          ? settings.timeValues
              .split(",")
              .map((v) => v.trim())
              .filter((v) => v)
          : [],
      };
      const response = await apiRequest("POST", "/api/rooms", backendSettings);
      return response.json();
    },
    onSuccess: (room) => {
      toast({
        title: "Room Created",
        description: `Room ${room.id} has been created successfully.`,
      });
      setLocation(
        `/room/${room.id}?creator=true&name=${encodeURIComponent(roomSettings.creatorName)}`,
      );
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🃏</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">
                Scrum Poker
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Plan Better,
            <span className="text-primary"> Estimate Smarter</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Real-time Scrum poker for agile teams. Streamline your planning
            sessions with collaborative estimation, dual voting systems, and
            comprehensive analytics.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Create Room Section */}
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create New Room</span>
              </CardTitle>
              <CardDescription>
                Set up a new estimation session for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={roomSettings.name}
                  onChange={(e) =>
                    setRoomSettings({ ...roomSettings, name: e.target.value })
                  }
                  placeholder="Enter room name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creator-name">Your Name</Label>
                <Input
                  id="creator-name"
                  value={roomSettings.creatorName}
                  onChange={(e) =>
                    setRoomSettings({
                      ...roomSettings,
                      creatorName: e.target.value,
                    })
                  }
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-4">
                <Label>Voting Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="story-points"
                      checked={roomSettings.voteForStoryPoints}
                      onCheckedChange={(checked) =>
                        setRoomSettings({
                          ...roomSettings,
                          voteForStoryPoints: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="story-points">Vote for Story Points</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="time-estimate"
                      checked={roomSettings.voteForTime}
                      onCheckedChange={(checked) =>
                        setRoomSettings({
                          ...roomSettings,
                          voteForTime: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="time-estimate">
                      Vote for Time Estimate
                    </Label>
                  </div>
                </div>
              </div>

              {roomSettings.voteForStoryPoints && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="story-system">Story Points System</Label>
                    <Select
                      value={roomSettings.storyPointsSystem}
                      onValueChange={(value) => {
                        const systems = {
                          fibonacci: "1, 2, 3, 5, 8, 13, 21, ?",
                          modified_fibonacci:
                            "0, 1/2, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?",
                          tshirt: "XS, S, M, L, XL, XXL, ?",
                          powers_of_2: "1, 2, 4, 8, 16, 32, ?",
                          linear: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?",
                        };
                        setRoomSettings({
                          ...roomSettings,
                          storyPointsSystem: value,
                          storyPointsValues:
                            systems[value as keyof typeof systems] ||
                            systems.fibonacci,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fibonacci">Fibonacci</SelectItem>
                        <SelectItem value="modified_fibonacci">
                          Modified Fibonacci
                        </SelectItem>
                        <SelectItem value="tshirt">T-Shirt Sizes</SelectItem>
                        <SelectItem value="powers_of_2">Powers of 2</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-values">Story Points Values</Label>
                    <Textarea
                      id="story-values"
                      value={roomSettings.storyPointsValues}
                      onChange={(e) =>
                        setRoomSettings({
                          ...roomSettings,
                          storyPointsValues: e.target.value,
                        })
                      }
                      placeholder="Enter values separated by commas (e.g., 1, 2, 3, 5, 8, 13, ?)"
                      className="min-h-[60px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Customize voting values. Separate with commas. Use "?" for
                      unknown.
                    </p>
                  </div>
                </div>
              )}

              {roomSettings.voteForTime && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="time-units">Time Units</Label>
                    <Select
                      value={roomSettings.timeUnits}
                      onValueChange={(value) => {
                        const units = {
                          minutes: "5, 10, 15, 30, 45, 60, 90, 120, ?",
                          hours: "1, 2, 4, 8, 12, 16, 20, 24, 32, 40, ?",
                          days: "0.5, 1, 1.5, 2, 2.5, 3, 5, ?",
                        };
                        setRoomSettings({
                          ...roomSettings,
                          timeUnits: value,
                          timeValues:
                            units[value as keyof typeof units] || units.hours,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-values">Time Estimation Values</Label>
                    <Textarea
                      id="time-values"
                      value={roomSettings.timeValues}
                      onChange={(e) =>
                        setRoomSettings({
                          ...roomSettings,
                          timeValues: e.target.value,
                        })
                      }
                      placeholder="Enter time values separated by commas (e.g., 1, 2, 4, 8, 16, ?)"
                      className="min-h-[60px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Customize time estimation values. Separate with commas.
                      Use "?" for unknown.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-reveal"
                  checked={roomSettings.autoReveal}
                  onCheckedChange={(checked) =>
                    setRoomSettings({ ...roomSettings, autoReveal: checked })
                  }
                />
                <Label htmlFor="auto-reveal">
                  Auto-reveal votes when everyone has voted
                </Label>
              </div>

              <Button
                onClick={() => createRoomMutation.mutate(roomSettings)}
                disabled={createRoomMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Section */}
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle>Join Existing Room</CardTitle>
                <CardDescription>
                  Enter a room ID to join an ongoing session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-id">Room ID</Label>
                  <Input
                    id="room-id"
                    value={joinRoomId}
                    onChange={(e) =>
                      setJoinRoomId(e.target.value.toUpperCase())
                    }
                    placeholder="Enter room ID (e.g., ABC123)"
                    className="uppercase"
                  />
                </div>
                <Button onClick={handleJoinRoom} className="w-full" size="lg">
                  Join Room
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">
                    Real-time Collaboration
                  </h3>
                  <p className="text-sm text-slate-600">
                    Collaborate with your team in real-time with instant vote
                    synchronization.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Dual Voting System</h3>
                  <p className="text-sm text-slate-600">
                    Estimate both story points and time for comprehensive
                    planning.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Analytics & History</h3>
                  <p className="text-sm text-slate-600">
                    Track estimation accuracy with detailed voting history and
                    statistics.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
