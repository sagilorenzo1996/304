import { useEffect, useReducer, useRef } from 'react';
import { sfx } from '../audio/sfx';
import { chooseBid, choosePlay, chooseTrumpCard } from '../game/ai';
import {
  collectTrick,
  createRound,
  GameState,
  nextRound,
  placeBid,
  playCard,
  requestReveal,
  selectTrump,
} from '../game/engine';
import { Seat } from '../game/types';

export const HUMAN: Seat = 0;

const AI_DELAY_MS = 900;
const COLLECT_DELAY_MS = 1600;

export type GameAction =
  | { type: 'BID'; seat: Seat; bid: number | null }
  | { type: 'SELECT_TRUMP'; cardId: string }
  | { type: 'PLAY'; seat: Seat; cardId: string }
  | { type: 'REVEAL'; seat: Seat }
  | { type: 'COLLECT' }
  | { type: 'NEXT_ROUND' }
  | { type: 'AI_BID' }
  | { type: 'AI_TRUMP' }
  | { type: 'AI_PLAY' };

function reducer(state: GameState, action: GameAction): GameState {
  try {
    switch (action.type) {
      case 'BID':
        return placeBid(state, action.seat, action.bid);
      case 'SELECT_TRUMP':
        return selectTrump(state, action.cardId);
      case 'PLAY':
        return playCard(state, action.seat, action.cardId);
      case 'REVEAL':
        return requestReveal(state, action.seat);
      case 'COLLECT':
        return collectTrick(state);
      case 'NEXT_ROUND':
        return nextRound(state);
      case 'AI_BID':
        return placeBid(state, state.bidTurn, chooseBid(state, state.bidTurn));
      case 'AI_TRUMP':
        return selectTrump(state, chooseTrumpCard(state, state.bidder as Seat));
      case 'AI_PLAY': {
        const move = choosePlay(state, state.turn);
        return move.action === 'reveal'
          ? requestReveal(state, state.turn)
          : playCard(state, state.turn, move.cardId);
      }
    }
  } catch (err) {
    // Illegal human clicks (out of turn, wrong suit) are simply ignored.
    console.warn(err);
    return state;
  }
}

/**
 * Game state plus the scheduler that drives the three AI seats and the
 * trick-collection pause, so the UI just renders state and dispatches
 * human intents.
 */
export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createRound(3, [0, 0], 1));

  // Sound effects, driven purely by state transitions.
  const prevRef = useRef(state);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (prev === state) return;

    if (state.round !== prev.round) sfx.deal();
    else if (prev.phase === 'trumpSelection' && state.phase === 'playing') sfx.deal();

    if (state.bidHistory.length > prev.bidHistory.length) {
      const last = state.bidHistory[state.bidHistory.length - 1];
      last.bid === null ? sfx.pass() : sfx.bid();
    }
    if (state.phase === 'playing' && state.currentTrick.length > prev.currentTrick.length) {
      sfx.playCard();
    }
    if (state.trickComplete && !prev.trickComplete) sfx.trick();
    if (state.trumpRevealed && !prev.trumpRevealed) sfx.reveal();
    if (state.phase === 'roundEnd' && prev.phase !== 'roundEnd' && state.roundResult) {
      const humanTeamWon = (state.roundResult.bidderTeam === 0) === state.roundResult.success;
      humanTeamWon ? sfx.roundWin() : sfx.roundLose();
    }
  }, [state]);

  useEffect(() => {
    let delay: number | null = null;
    let action: GameAction | null = null;

    if (state.trickComplete) {
      delay = COLLECT_DELAY_MS;
      action = { type: 'COLLECT' };
    } else if (state.phase === 'bidding' && state.bidTurn !== HUMAN) {
      delay = AI_DELAY_MS;
      action = { type: 'AI_BID' };
    } else if (state.phase === 'trumpSelection' && state.bidder !== HUMAN) {
      delay = AI_DELAY_MS;
      action = { type: 'AI_TRUMP' };
    } else if (state.phase === 'playing' && state.turn !== HUMAN) {
      delay = AI_DELAY_MS;
      action = { type: 'AI_PLAY' };
    }

    if (delay === null || action === null) return;
    const pending = action;
    const timer = window.setTimeout(() => dispatch(pending), delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  return { state, dispatch };
}
