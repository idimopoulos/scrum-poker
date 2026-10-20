import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Room, Vote } from "@shared/schema";

interface StoryPointMeaning {
  label: string;
  description: string;
}

const MEANINGS = {
  none: { label: "No effort", description: "Already done or nothing to change." },
  noBrainer: { label: "No brainer", description: "E.g. fixing a typo." },
  trivial: {
    label: "Trivial",
    description:
      "The smallest task that still needs some code, e.g. typecast a string or add an attribute to a class.",
  },
  normal: {
    label: "Normal",
    description:
      "A usual task we already know how to do, e.g. add a new vocabulary or a new formatter.",
  },
  difficult: {
    label: "Difficult",
    description:
      "Some constraints make it a bit painful, or there is some uncertainty, e.g. working on functionality you are not familiar with.",
  },
  risky: {
    label: "Risky",
    description: "More difficult than the previous, or higher uncertainty, so it carries some risk.",
  },
  veryDifficult: {
    label: "Very difficult",
    description:
      "A very high amount of complexity, usually more than one complexity in the same task, e.g. implement a new API.",
  },
  extreme: { label: "Extreme", description: "Reinvent Google." },
  unknown: { label: "Unknown", description: "Not enough information to estimate." },
} satisfies Record<string, StoryPointMeaning>;

const TSHIRT_MEANINGS: Record<string, StoryPointMeaning> = {
  XS: MEANINGS.noBrainer,
  S: MEANINGS.trivial,
  M: MEANINGS.normal,
  L: MEANINGS.difficult,
  XL: MEANINGS.risky,
  XXL: MEANINGS.veryDifficult,
};

function storyPointMeaning(value: string): StoryPointMeaning | undefined {
  if (value === "?") return MEANINGS.unknown;
  if (TSHIRT_MEANINGS[value]) return TSHIRT_MEANINGS[value];

  const [numerator, denominator] = value.split("/").map(Number);
  const points = denominator ? numerator / denominator : numerator;
  if (Number.isNaN(points)) return undefined;

  if (points === 0) return MEANINGS.none;
  if (points <= 1) return MEANINGS.noBrainer;
  if (points <= 2) return MEANINGS.trivial;
  if (points <= 3) return MEANINGS.normal;
  if (points <= 5) return MEANINGS.difficult;
  if (points <= 8) return MEANINGS.risky;
  if (points <= 13) return MEANINGS.veryDifficult;
  return MEANINGS.extreme;
}

// Groups consecutive values that share a meaning, e.g. "20, 40, 100" -> Extreme.
function storyPointLegend(values: string[]) {
  const rows: { values: string[]; meaning: StoryPointMeaning }[] = [];
  for (const value of values) {
    const meaning = storyPointMeaning(value);
    if (!meaning) continue;
    const last = rows[rows.length - 1];
    if (last?.meaning === meaning) last.values.push(value);
    else rows.push({ values: [value], meaning });
  }
  return rows;
}

interface VotingCardsProps {
  room: Room;
  currentVote?: Vote;
  onVote: (storyPoints?: string, timeEstimate?: string) => void;
  isRevealed: boolean;
}

export default function VotingCards({ room, currentVote, onVote, isRevealed }: VotingCardsProps) {
  const handleStoryPointSelect = (value: string) => {
    onVote(value, currentVote?.timeEstimate || undefined);
  };

  const handleTimeEstimateSelect = (value: string) => {
    onVote(currentVote?.storyPoints || undefined, value);
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Select your estimate:</h3>
      
      {/* Story Points Cards */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Story Points
          </h4>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-primary hover:bg-blue-100 transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
                What do points mean?
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] text-sm">
              <p className="font-medium text-slate-800 mb-1">What story points mean</p>
              <p className="text-slate-600 mb-3">
                Story points measure the relative complexity, effort and uncertainty of a
                task compared to others, not hours. Pick the value that best matches how
                big and how risky the task feels.
              </p>
              <dl className="space-y-1.5">
                {storyPointLegend(room.storyPointValues).map((row) => (
                  <div key={row.values.join()} className="flex gap-3">
                    <dt className="w-16 shrink-0 font-semibold text-slate-800">
                      {row.values.join(", ")}
                    </dt>
                    <dd className="text-slate-600">
                      <span className="font-medium text-slate-800">{row.meaning.label}:</span>{" "}
                      {row.meaning.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
        </div>
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
