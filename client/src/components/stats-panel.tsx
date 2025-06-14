import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { Room, Vote, VotingHistory, Participant } from "@shared/schema";

interface StatsPanelProps {
  room: Room;
  votes: Vote[];
  history: VotingHistory[];
  participants: Participant[];
  votingProgress: number;
  currentParticipant: Participant | null;
}

export default function StatsPanel({ 
  room, 
  votes, 
  history, 
  participants, 
  votingProgress,
  currentParticipant 
}: StatsPanelProps) {
  const getCurrentStats = () => {
    if (votes.length === 0) {
      return {
        storyPoints: "Voting...",
        timeEstimate: "Voting..."
      };
    }

    const storyVotes = votes.filter(v => v.storyPoints).map(v => v.storyPoints!);
    const timeVotes = votes.filter(v => v.timeEstimate).map(v => v.timeEstimate!);

    return {
      storyPoints: storyVotes.length > 0 ? `${storyVotes.length} votes` : "No votes",
      timeEstimate: timeVotes.length > 0 ? `${timeVotes.length} votes` : "No votes"
    };
  };

  const currentStats = getCurrentStats();

  return (
    <div className="space-y-6">
      
      {/* Current Round Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Current Round
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Story Points</span>
            <span className="text-sm font-medium text-slate-800">
              {currentStats.storyPoints}
            </span>
          </div>
          {room.dualVoting && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Time Estimate</span>
              <span className="text-sm font-medium text-slate-800">
                {currentStats.timeEstimate}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Progress</span>
              <span>{votingProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${votingProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Room Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Voting Type</span>
            <span className="text-sm font-medium text-slate-800">
              {room.dualVoting ? "Dual Voting" : "Story Points Only"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Auto Reveal</span>
            <span className="text-sm font-medium text-slate-800">
              {room.autoReveal ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Participants</span>
            <span className="text-sm font-medium text-slate-800">
              {participants.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">System</span>
            <span className="text-sm font-medium text-slate-800">
              {room.votingSystem}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Room Settings - Only for administrators */}
      {currentParticipant?.isCreator && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Room Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-600 block mb-1">Voting System</Label>
              <Select value={room.votingSystem} disabled>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibonacci">Fibonacci</SelectItem>
                  <SelectItem value="tshirt">T-Shirt Sizes</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 block mb-1">Time Units</Label>
              <Select value={room.timeUnits} disabled>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-600">Dual Voting Mode</Label>
              <Switch checked={room.dualVoting} disabled />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
