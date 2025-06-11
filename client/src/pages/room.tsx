import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Share, Settings, Eye, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VotingCards from "@/components/voting-cards";
import ParticipantsPanel from "@/components/participants-panel";
import StatsPanel from "@/components/stats-panel";
import ShareModal from "@/components/share-modal";
import JoinModal from "@/components/join-modal";
import type { Participant } from "@shared/schema";

export default function Room() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomId = params.id;
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [autoReveal, setAutoReveal] = useState(false);

  const { data: roomData, isLoading, error } = useQuery({
    queryKey: [`/api/rooms/${roomId}`],
    enabled: !!roomId,
  });

  const { isConnected, roomState, sendVote, revealVotes, nextRound } = useWebSocket(
    roomId || null,
    participant?.id || null
  );

  useEffect(() => {
    if (error) {
      toast({
        title: "Room Not Found",
        description: "The room you're looking for doesn't exist.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    if (roomData && !participant) {
      const urlParams = new URLSearchParams(window.location.search);
      const isCreator = urlParams.get("creator") === "true";
      
      if (isCreator) {
        // If creator, create participant automatically
        handleJoinRoom("Room Creator");
      } else {
        // Show join modal for others
        setShowJoinModal(true);
      }
    }
  }, [roomData, error, participant]);

  useEffect(() => {
    if (roomState.room) {
      setAutoReveal(roomState.room.autoReveal);
    }
  }, [roomState.room]);

  const handleJoinRoom = async (name: string) => {
    try {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/join`, { name });
      const newParticipant = await response.json();
      setParticipant(newParticipant);
      setShowJoinModal(false);
      toast({
        title: "Joined Room",
        description: `Welcome to the planning session, ${name}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVote = (storyPoints?: string, timeEstimate?: string) => {
    sendVote(storyPoints, timeEstimate);
  };

  const handleRevealVotes = () => {
    revealVotes();
  };

  const handleNextRound = () => {
    nextRound();
  };

  const handleAutoRevealChange = async (checked: boolean) => {
    try {
      await apiRequest("PATCH", `/api/rooms/${roomId}`, { autoReveal: checked });
      setAutoReveal(checked);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update auto-reveal setting.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-96 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const room = roomState.room || roomData?.room;
  const participants = roomState.participants || roomData?.participants || [];
  const votes = roomState.votes || roomData?.votes || [];
  const history = roomState.history || roomData?.history || [];

  if (!room || !participant) {
    return (
      <>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600">Loading room...</p>
            </CardContent>
          </Card>
        </div>
        <JoinModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinRoom}
          roomId={roomId || ""}
        />
      </>
    );
  }

  const currentUserVote = votes.find(v => v.participantId === participant.id);
  const allParticipantsVoted = participants.every(p => {
    const vote = votes.find(v => v.participantId === p.id);
    if (!vote) return false;
    if (room.dualVoting) {
      return vote.storyPoints && vote.timeEstimate;
    }
    return vote.storyPoints;
  });

  const votingProgress = participants.length > 0 
    ? Math.round((votes.length / participants.length) * 100) 
    : 0;

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">🃏</span>
                  </div>
                  <h1 className="text-xl font-semibold text-slate-800">Scrum Poker</h1>
                </div>
                <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
                  <span>Room:</span>
                  <code className="bg-slate-100 px-2 py-1 rounded font-mono">{room.id}</code>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Share Room</span>
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Voting Area */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Current Round Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 mb-1">
                        Round {room.currentRound}
                      </h2>
                      <p className="text-slate-600">
                        {room.currentDescription || "Planning session in progress"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      <span className="text-sm text-slate-500">Voting for:</span>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          Story Points
                        </span>
                        {room.dualVoting && (
                          <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded-full">
                            Time ({room.timeUnits})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voting Cards */}
                  <VotingCards
                    room={room}
                    currentVote={currentUserVote}
                    onVote={handleVote}
                    isRevealed={room.isRevealed}
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                      <Button onClick={handleRevealVotes} disabled={room.isRevealed}>
                        <Eye className="h-4 w-4 mr-2" />
                        Reveal Cards
                      </Button>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-reveal"
                          checked={autoReveal}
                          onCheckedChange={handleAutoRevealChange}
                        />
                        <Label htmlFor="auto-reveal" className="text-sm text-slate-600">
                          Auto-reveal when all voted
                        </Label>
                      </div>
                    </div>
                    <Button 
                      onClick={handleNextRound}
                      variant="outline"
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                    >
                      Next Round
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Participants Panel */}
              <ParticipantsPanel
                participants={participants}
                votes={votes}
                dualVoting={room.dualVoting}
                isRevealed={room.isRevealed}
                votingProgress={votingProgress}
              />
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-1">
              <StatsPanel
                room={room}
                votes={votes}
                history={history}
                participants={participants}
                votingProgress={votingProgress}
              />
            </div>
          </div>
        </main>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomId={room.id}
      />
    </>
  );
}
