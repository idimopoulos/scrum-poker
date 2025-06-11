import { Card, CardContent } from "@/components/ui/card";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Participant, Vote } from "@shared/schema";

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
        <div className="mt-4 text-sm text-slate-600 text-center">
          <div className="flex items-center justify-between mb-2">
            <span>Voting Progress</span>
            <span>{votingProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${votingProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
