import { useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '@/lib/websocket';
import type { Room, Participant, Vote, VotingHistory } from '@shared/schema';

interface RoomState {
  room: Room | null;
  participants: Participant[];
  votes: Vote[];
  history: VotingHistory[];
}

export function useWebSocket(roomId: string | null, participantId: string | null) {
  const wsRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [usePolling, setUsePolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    room: null,
    participants: [],
    votes: [],
    history: []
  });

  useEffect(() => {
    if (!roomId || !participantId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    const ws = new WebSocketClient(wsUrl);
    wsRef.current = ws;

    ws.on('room_update', (payload) => {
      setRoomState({
        room: payload.room,
        participants: payload.participants,
        votes: payload.votes,
        history: payload.history
      });
    });

    ws.on('error', (payload) => {
      console.error('WebSocket error:', payload.message);
    });

    ws.connect()
      .then(() => {
        setIsConnected(true);
        setUsePolling(false);
        // Join the room
        ws.send({
          type: 'join_room',
          payload: { roomId, participantId }
        });
      })
      .catch((error) => {
        console.error('WebSocket connection failed, falling back to polling:', error);
        setIsConnected(false);
        setUsePolling(true);
        
        // Start polling as fallback
        const pollRoom = async () => {
          try {
            const response = await fetch(`/api/rooms/${roomId}`);
            if (response.ok) {
              const data = await response.json();
              setRoomState(data);
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        };
        
        // Poll every 2 seconds
        pollRoom();
        pollingIntervalRef.current = setInterval(pollRoom, 2000);
      });

    return () => {
      ws.disconnect();
      setIsConnected(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [roomId, participantId]);

  const sendVote = async (storyPoints?: string, timeEstimate?: string) => {
    if (!roomId || !participantId) return;

    if (isConnected && wsRef.current) {
      // Use WebSocket if connected
      wsRef.current.send({
        type: 'vote',
        payload: { roomId, participantId, storyPoints, timeEstimate }
      });
    } else if (usePolling) {
      // Use HTTP API if falling back to polling
      try {
        await fetch(`/api/rooms/${roomId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, storyPoints, timeEstimate })
        });
      } catch (error) {
        console.error('Failed to send vote:', error);
      }
    }
  };

  const revealVotes = async () => {
    if (!roomId) return;

    if (isConnected && wsRef.current) {
      wsRef.current.send({
        type: 'reveal_votes',
        payload: { roomId }
      });
    } else if (usePolling) {
      try {
        await fetch(`/api/rooms/${roomId}/reveal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Failed to reveal votes:', error);
      }
    }
  };

  const nextRound = async (description?: string) => {
    if (!roomId) return;

    if (isConnected && wsRef.current) {
      wsRef.current.send({
        type: 'next_round',
        payload: { roomId, description }
      });
    } else if (usePolling) {
      try {
        await fetch(`/api/rooms/${roomId}/next-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        });
      } catch (error) {
        console.error('Failed to start next round:', error);
      }
    }
  };

  return {
    isConnected,
    usePolling,
    roomState,
    sendVote,
    revealVotes,
    nextRound
  };
}
