import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Room, Vote, VotingHistory, Participant } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Share, Settings, Eye, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VotingCards from "@/components/voting-cards";
import ParticipantsPanel from "@/components/participants-panel";
import StatsPanel from "@/components/stats-panel";
import ShareModal from "@/components/share-modal";
import JoinModal from "@/components/join-modal";
import AuthHeader from "@/components/auth-header";


export default function Room() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomId = params.id;
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [autoReveal, setAutoReveal] = useState(false);
  const [nextRoundDescription, setNextRoundDescription] = useState("");
  const [clearDescriptionOnNextRound, setClearDescriptionOnNextRound] = useState(true);

  const { data: roomData, isLoading, error } = useQuery<{
    room: Room;
    participants: Participant[];
    votes: Vote[];
    history: VotingHistory[];
  }>({
    queryKey: [`/api/rooms/${roomId}`],
    enabled: !!roomId,
  });

  const handleKicked = () => {
    // Clear participant state
    setParticipant(null);
    
    // Show toast notification
    toast({
      title: "Removed from Room",
      description: "You have been removed from the room by the room creator.",
      variant: "destructive",
    });
    
    // Show join modal to allow rejoin
    setShowJoinModal(true);
  };

  const handleLeaveRoom = () => {
    // Clear localStorage for this room
    if (roomId) {
      localStorage.removeItem(`participant_${roomId}`);
      localStorage.removeItem(`participant_name_${roomId}`);
    }
    
    // Navigate to home page
    setLocation('/');
  };

  const { isConnected, usePolling, roomState, sendVote, revealVotes, nextRound, ws } = useWebSocket(
    roomId || null,
    participant?.id || null,
    { onKicked: handleKicked }
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
      // Check if participant is stored in localStorage
      const storedParticipantId = localStorage.getItem(`participant_${roomId}`);
      const storedParticipantName = localStorage.getItem(`participant_name_${roomId}`);
      
      if (storedParticipantId && storedParticipantName && roomData && roomData.participants) {
        // Find existing participant in room data
        const existingParticipant = roomData.participants.find((p: Participant) => p.id === storedParticipantId);
        if (existingParticipant) {
          setParticipant(existingParticipant);
          return;
        }
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const isCreator = urlParams.get("creator") === "true";
      const creatorName = urlParams.get("name");
      
      if (isCreator && creatorName) {
        // If creator, create participant automatically with their chosen name
        handleJoinRoom(creatorName, true);
        
        // Remove URL parameters to prevent duplicate joins when URL is shared
        window.history.replaceState({}, '', `/room/${roomId}`);
      } else {
        // Show join modal for others
        setShowJoinModal(true);
      }
    }
  }, [roomData, error, participant, roomId]);

  useEffect(() => {
    if (roomState.room) {
      setAutoReveal(roomState.room.autoReveal);
    }
  }, [roomState.room]);

  const handleJoinRoom = async (name: string, isCreator: boolean = false) => {
    try {
      // Check for existing participant ID in localStorage for session persistence
      const storedParticipantId = localStorage.getItem(`participant_${roomId}`);
      
      const response = await apiRequest("POST", `/api/rooms/${roomId}/join`, { 
        name, 
        isCreator,
        participantId: storedParticipantId // Send stored ID for rehydration
      });
      const data = await response.json();
      const newParticipant = data.participant || data;
      
      // Clear localStorage if this is a new participant (not rehydrated)
      // This handles the case where a kicked user rejoins with a new identity
      if (!data.rehydrated && storedParticipantId) {
        localStorage.removeItem(`participant_${roomId}`);
        localStorage.removeItem(`participant_name_${roomId}`);
      }
      
      setParticipant(newParticipant);
      setShowJoinModal(false);
      
      // Store participant info in localStorage to persist across sessions
      localStorage.setItem(`participant_${roomId}`, newParticipant.id);
      localStorage.setItem(`participant_name_${roomId}`, newParticipant.name);
      
      toast({
        title: data.rehydrated ? "Rejoined Room" : "Joined Room",
        description: data.rehydrated 
          ? `Welcome back, ${newParticipant.name}!` 
          : `Welcome to the planning session, ${name}!`,
      });
    } catch (error) {
      // Clear localStorage on join failure
      localStorage.removeItem(`participant_${roomId}`);
      localStorage.removeItem(`participant_name_${roomId}`);
      
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
    nextRound(nextRoundDescription);
    if (clearDescriptionOnNextRound) {
      setNextRoundDescription("");
    }
  };

  const handleKickParticipant = (participantId: string) => {
    if (ws && participant?.isCreator && room) {
      ws.send({
        type: 'kick_participant',
        payload: {
          roomId: room.id,
          participantId
        }
      });
    }
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
          onJoin={(name) => handleJoinRoom(name, false)}
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
    ? Math.round((participants.filter(p => {
        const vote = votes.find(v => v.participantId === p.id);
        if (!vote) return false;
        if (room.dualVoting) {
          return vote.storyPoints && vote.timeEstimate;
        }
        return vote.storyPoints;
      }).length / participants.length) * 100) 
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
                {/* Connection Status */}
                <div className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : usePolling ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-slate-600 hidden sm:inline">
                    {isConnected ? 'Real-time' : usePolling ? 'Polling' : 'Offline'}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Share Room</span>
                </Button>
                
                <AuthHeader 
                  mode="room"
                  roomId={roomId}
                  onLeave={handleLeaveRoom}
                />
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
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    {/* Admin Controls - Only for room creator */}
                    {participant?.isCreator && (
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-4">
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
                        
                        <div className="flex flex-col sm:flex-row sm:items-end space-y-2 sm:space-y-0 sm:space-x-3">
                          <div className="flex-1">
                            <Label htmlFor="task-description" className="text-sm text-slate-600">
                              Task Description (optional)
                            </Label>
                            <Input
                              id="task-description"
                              value={nextRoundDescription}
                              onChange={(e) => setNextRoundDescription(e.target.value)}
                              placeholder="Enter task description for next round"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="clear-description"
                              checked={clearDescriptionOnNextRound}
                              onCheckedChange={(checked) => setClearDescriptionOnNextRound(!!checked)}
                            />
                            <Label htmlFor="clear-description" className="text-sm text-slate-600">
                              Clear description on next round
                            </Label>
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
                      </div>
                    )}
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
                currentParticipant={participant}
                onKickParticipant={handleKickParticipant}
              />
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-1">
              <StatsPanel
                room={room}
                votes={votes}
                history={[]}
                participants={participants}
                votingProgress={votingProgress}
                currentParticipant={participant}
              />
            </div>
          </div>

          {/* Voting History Section - Moved to Bottom */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Voting History
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Latest {Math.min(history.length, 20)} rounds
                </p>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p>No voting history yet</p>
                    <p className="text-sm">Complete a round to see statistics here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history
                      .sort((a, b) => b.round - a.round)
                      .slice(0, 20)
                      .map((round) => (
                        <div key={round.id} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-slate-800">Round {round.round}</h4>
                              {round.description && (
                                <p className="text-sm text-slate-600 mt-1">{round.description}</p>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(round.completedAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {true && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-600">Story Points</span>
                                </div>
                                <div className="space-y-1">
                                  {round.storyPointsConsensus && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Consensus:</span>
                                      <span className="font-medium text-emerald-600">
                                        {round.storyPointsConsensus}
                                      </span>
                                    </div>
                                  )}
                                  {round.storyPointsAvg && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Average:</span>
                                      <span className="text-slate-700">{round.storyPointsAvg}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {room.dualVoting && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-600">Time Estimate</span>
                                </div>
                                <div className="space-y-1">
                                  {round.timeEstimateConsensus && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Consensus:</span>
                                      <span className="font-medium text-blue-600">
                                        {round.timeEstimateConsensus}
                                      </span>
                                    </div>
                                  )}
                                  {round.timeEstimateAvg && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Average:</span>
                                      <span className="text-slate-700">{round.timeEstimateAvg}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                    {history.length > 20 && (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        Showing latest 20 of {history.length} rounds
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
