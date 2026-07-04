import BiddingModal from './components/BiddingModal';
import MuteButton from './components/MuteButton';
import RoundEndModal from './components/RoundEndModal';
import Scoreboard from './components/Scoreboard';
import Table from './components/Table';
import TrumpSelectModal from './components/TrumpSelectModal';
import { HUMAN, useGame } from './hooks/useGame';

export default function App() {
  const { state, dispatch } = useGame();

  const humanBidding =
    state.phase === 'bidding' && state.bidTurn === HUMAN && !state.passed[HUMAN];
  const humanPickingTrump = state.phase === 'trumpSelection' && state.bidder === HUMAN;

  return (
    <div className="app">
      <Table
        state={state}
        onPlayCard={(cardId) => dispatch({ type: 'PLAY', seat: HUMAN, cardId })}
        onRequestReveal={() => dispatch({ type: 'REVEAL', seat: HUMAN })}
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
    </div>
  );
}
