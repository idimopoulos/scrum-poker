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
        // Join the room
        ws.send({
          type: 'join_room',
          payload: { roomId, participantId }
        });
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      });

    return () => {
      ws.disconnect();
      setIsConnected(false);
    };
  }, [roomId, participantId]);

  const sendVote = (storyPoints?: string, timeEstimate?: string) => {
    if (wsRef.current && roomId && participantId) {
      wsRef.current.send({
        type: 'vote',
        payload: { roomId, participantId, storyPoints, timeEstimate }
      });
    }
  };

  const revealVotes = () => {
    if (wsRef.current && roomId) {
      wsRef.current.send({
        type: 'reveal_votes',
        payload: { roomId }
      });
    }
  };

  const nextRound = (description?: string) => {
    if (wsRef.current && roomId) {
      wsRef.current.send({
        type: 'next_round',
        payload: { roomId, description }
      });
    }
  };

  return {
    isConnected,
    roomState,
    sendVote,
    revealVotes,
    nextRound
  };
}
