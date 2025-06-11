import { cn } from "@/lib/utils";
import type { Room, Vote } from "@shared/schema";

interface VotingCardsProps {
  room: Room;
  currentVote?: Vote;
  onVote: (storyPoints?: string, timeEstimate?: string) => void;
  isRevealed: boolean;
}

export default function VotingCards({ room, currentVote, onVote, isRevealed }: VotingCardsProps) {
  const handleStoryPointSelect = (value: string) => {
    onVote(value, currentVote?.timeEstimate);
  };

  const handleTimeEstimateSelect = (value: string) => {
    onVote(currentVote?.storyPoints, value);
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Select your estimate:</h3>
      
      {/* Story Points Cards */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
          Story Points
        </h4>
        <div className="flex flex-wrap gap-2">
          {room.storyPointValues.map((value) => (
            <button
              key={value}
              onClick={() => handleStoryPointSelect(value)}
              disabled={isRevealed}
              className={cn(
                "group relative w-16 h-20 bg-white border-2 rounded-lg transition-all duration-200 flex items-center justify-center",
                currentVote?.storyPoints === value
                  ? "bg-primary border-primary shadow-md"
                  : "border-slate-200 hover:border-primary hover:shadow-md",
                isRevealed && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className={cn(
                "text-lg font-semibold transition-colors",
                currentVote?.storyPoints === value
                  ? "text-white"
                  : "text-slate-700 group-hover:text-primary"
              )}>
                {value}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Estimation Cards */}
      {room.dualVoting && (
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
            Time ({room.timeUnits})
          </h4>
          <div className="flex flex-wrap gap-2">
            {room.timeValues.map((value) => (
              <button
                key={value}
                onClick={() => handleTimeEstimateSelect(value)}
                disabled={isRevealed}
                className={cn(
                  "group relative w-16 h-20 bg-white border-2 rounded-lg transition-all duration-200 flex items-center justify-center",
                  currentVote?.timeEstimate === value
                    ? "bg-emerald-500 border-emerald-500 shadow-md"
                    : "border-slate-200 hover:border-emerald-500 hover:shadow-md",
                  isRevealed && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "text-sm font-semibold transition-colors",
                  currentVote?.timeEstimate === value
                    ? "text-white"
                    : "text-slate-700 group-hover:text-emerald-600"
                )}>
                  {value === '?' ? '?' : `${value}${room.timeUnits[0]}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
