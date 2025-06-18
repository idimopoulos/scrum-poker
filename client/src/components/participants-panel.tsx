import { Card, CardContent } from "@/components/ui/card";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Participant, Vote } from "@shared/schema";

// Voting Statistics Component
interface VotingStatisticsProps {
  votes: Vote[];
  participants: Participant[];
  isRevealed: boolean;
  dualVoting: boolean;
}

function VotingStatistics({ votes, participants, isRevealed, dualVoting }: VotingStatisticsProps) {
  const calculateStats = (votesWithValues: Array<{value: string, participantId: string}>) => {
    if (votesWithValues.length === 0 || !isRevealed) {
      return { avg: "-", min: "-", max: "-", minParticipants: [], maxParticipants: [] };
    }

    // Convert values to numeric for comparison
    const valueMap = new Map<string, number>();
    const tshirtMap: Record<string, number> = {
      'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6
    };

    const processedVotes = votesWithValues.map(vote => {
      let numericValue: number;
      if (vote.value === "?") {
        numericValue = 0;
      } else if (tshirtMap[vote.value]) {
        numericValue = tshirtMap[vote.value];
      } else {
        const parsed = parseFloat(vote.value);
        numericValue = isNaN(parsed) ? 0 : parsed;
      }
      
      return {
        ...vote,
        numericValue,
        originalValue: vote.value
      };
    }).filter(v => v.numericValue > 0);

    if (processedVotes.length === 0) {
      return { avg: "-", min: "-", max: "-", minParticipants: [], maxParticipants: [] };
    }

    const numericValues = processedVotes.map(v => v.numericValue);
    const avg = (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(1);
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);

    // Find participants with min and max values
    const minVotes = processedVotes.filter(v => v.numericValue === minValue);
    const maxVotes = processedVotes.filter(v => v.numericValue === maxValue);

    const getParticipantName = (participantId: string) => {
      const participant = participants.find(p => p.id === participantId);
      return participant?.name || 'Unknown';
    };

    const minParticipants = minVotes.map(v => ({
      name: getParticipantName(v.participantId),
      value: v.originalValue
    }));

    const maxParticipants = maxVotes.map(v => ({
      name: getParticipantName(v.participantId),
      value: v.originalValue
    }));

    return { 
      avg, 
      min: minVotes[0]?.originalValue || "-", 
      max: maxVotes[0]?.originalValue || "-",
      minParticipants,
      maxParticipants
    };
  };

  const storyPointVotes = votes.filter(v => v.storyPoints).map(v => ({ 
    value: v.storyPoints!, 
    participantId: v.participantId 
  }));
  const timeVotes = votes.filter(v => v.timeEstimate).map(v => ({ 
    value: v.timeEstimate!, 
    participantId: v.participantId 
  }));

  const storyStats = calculateStats(storyPointVotes);
  const timeStats = calculateStats(timeVotes);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Story points</h4>
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-slate-500 mb-1">Avg</div>
            <div className="font-medium text-slate-700">{storyStats.avg}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Min</div>
            <div className="font-medium text-slate-700">{storyStats.min}</div>
            {storyStats.minParticipants.length > 0 && (
              <div className="text-xs text-slate-400 mt-1 leading-tight">
                {storyStats.minParticipants.map(p => p.name).join(', ')}
              </div>
            )}
          </div>
          <div>
            <div className="text-slate-500 mb-1">Max</div>
            <div className="font-medium text-slate-700">{storyStats.max}</div>
            {storyStats.maxParticipants.length > 0 && (
              <div className="text-xs text-slate-400 mt-1 leading-tight">
                {storyStats.maxParticipants.map(p => p.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {dualVoting && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Time</h4>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-slate-500 mb-1">Avg</div>
              <div className="font-medium text-slate-700">{timeStats.avg}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Min</div>
              <div className="font-medium text-slate-700">{timeStats.min}</div>
              {timeStats.minParticipants.length > 0 && (
                <div className="text-xs text-slate-400 mt-1 leading-tight">
                  {timeStats.minParticipants.map(p => p.name).join(', ')}
                </div>
              )}
            </div>
            <div>
              <div className="text-slate-500 mb-1">Max</div>
              <div className="font-medium text-slate-700">{timeStats.max}</div>
              {timeStats.maxParticipants.length > 0 && (
                <div className="text-xs text-slate-400 mt-1 leading-tight">
                  {timeStats.maxParticipants.map(p => p.name).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParticipantsPanelProps {
  participants: Participant[];
  votes: Vote[];
  dualVoting: boolean;
  isRevealed: boolean;
  votingProgress: number;
}

export default function ParticipantsPanel({ 
  participants, 
  votes, 
  dualVoting, 
  isRevealed, 
  votingProgress 
}: ParticipantsPanelProps) {
  const getParticipantInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getParticipantVote = (participantId: string) => {
    return votes.find(v => v.participantId === participantId);
  };

  const getParticipantColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-emerald-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Participants</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant, index) => {
            const vote = getParticipantVote(participant.id);
            const hasStoryPointVote = vote?.storyPoints !== null && vote?.storyPoints !== undefined;
            const hasTimeVote = vote?.timeEstimate !== null && vote?.timeEstimate !== undefined;
            
            return (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    getParticipantColor(index)
                  )}>
                    <span className="text-white text-sm font-medium">
                      {getParticipantInitials(participant.name)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">{participant.name}</span>
                    {participant.isCreator && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Creator
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Story Points Vote Status */}
                  <div className={cn(
                    "w-6 h-8 rounded flex items-center justify-center",
                    hasStoryPointVote 
                      ? "bg-primary" 
                      : "bg-slate-200"
                  )}>
                    {isRevealed && hasStoryPointVote ? (
                      <span className="text-white text-xs font-bold">{vote.storyPoints}</span>
                    ) : hasStoryPointVote ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : (
                      <Clock className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                  
                  {/* Time Vote Status */}
                  {dualVoting && (
                    <div className={cn(
                      "w-6 h-8 rounded flex items-center justify-center",
                      hasTimeVote 
                        ? "bg-emerald-500" 
                        : "bg-slate-200"
                    )}>
                      {isRevealed && hasTimeVote ? (
                        <span className="text-white text-xs font-bold">{vote.timeEstimate}</span>
                      ) : hasTimeVote ? (
                        <Check className="h-3 w-3 text-white" />
                      ) : (
                        <Clock className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-sm text-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span>Voting Progress</span>
            <span>{votingProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${votingProgress}%` }}
            />
          </div>
          
          {/* Voting Statistics */}
          <VotingStatistics 
            votes={votes} 
            participants={participants}
            isRevealed={isRevealed} 
            dualVoting={dualVoting} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
