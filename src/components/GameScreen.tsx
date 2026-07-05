import { GameState } from '../game/engine';
import { useGame, HUMAN } from '../hooks/useGame';
import BiddingModal from './BiddingModal';
import MuteButton from './MuteButton';
import RoundEndModal from './RoundEndModal';
import Scoreboard from './Scoreboard';
import Table from './Table';
import TrumpSelectModal from './TrumpSelectModal';

interface Props {
  initialState: GameState;
}

export default function GameScreen({ initialState }: Props) {
  const { state, dispatch } = useGame(initialState);

  const humanBidding =
    state.phase === 'bidding' && state.bidTurn === HUMAN && !state.passed[HUMAN];
  const humanPickingTrump = state.phase === 'trumpSelection' && state.bidder === HUMAN;

  return (
    <>
      <Table
        state={state}
        onPlayCard={(cardId, guess) => dispatch({ type: 'PLAY', seat: HUMAN, cardId, guess })}
        onRequestReveal={() => dispatch({ type: 'REVEAL', seat: HUMAN })}
        onSubmitHiddenTrump={() => dispatch({ type: 'SUBMIT_HIDDEN_TRUMP', seat: HUMAN })}
      />
      <Scoreboard state={state} />
      <MuteButton />
      {humanBidding && (
        <BiddingModal state={state} onBid={(bid) => dispatch({ type: 'BID', seat: HUMAN, bid })} />
      )}
      {humanPickingTrump && (
        <TrumpSelectModal
          state={state}
          onSelect={(cardId) => dispatch({ type: 'SELECT_TRUMP', cardId })}
        />
      )}
      {state.phase === 'roundEnd' && (
        <RoundEndModal state={state} onNextRound={() => dispatch({ type: 'NEXT_ROUND' })} />
      )}
    </>
  );
}
