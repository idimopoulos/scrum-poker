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

      {/* Voting History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              History
            </CardTitle>
            <button className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No completed rounds yet
            </p>
          ) : (
            history.slice(0, 5).map((round) => (
              <div key={round.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">
                  Round {round.round} - {round.description || "No description"}
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    {round.storyPointsConsensus && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {round.storyPointsConsensus} pts
                      </span>
                    )}
                    {round.timeEstimateConsensus && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                        {round.timeEstimateConsensus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-slate-500">Avg</div>
                    <div className="font-medium text-slate-700">
                      {round.storyPointsAvg || "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500">Min</div>
                    <div className="font-medium text-slate-700">
                      {round.storyPointsMin || "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500">Max</div>
                    <div className="font-medium text-slate-700">
                      {round.storyPointsMax || "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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
