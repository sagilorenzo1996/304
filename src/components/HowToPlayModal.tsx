interface Props {
  onClose: () => void;
}

export default function HowToPlayModal({ onClose }: Props) {
  return (
    <div className="overlay">
      <div className="modal how-to-play">
        <h2>How to Play</h2>
        <ol>
          <li>
            <strong>First deal</strong> — everyone receives 4 cards.
          </li>
          <li>
            <strong>Bidding</strong> — starting left of the dealer, players bid (minimum 200,
            raises in steps of 10, maximum 304) or pass. A pass is final. The highest bidder wins
            the right to set the trump. If all four players pass, the hand is redealt.
          </li>
          <li>
            <strong>Trump selection</strong> — the bidder places one card from their hand face
            down; its suit is the secret trump.
          </li>
          <li>
            <strong>Second deal</strong> — 4 more cards each (the bidder plays one card short
            until the trump is revealed).
          </li>
          <li>
            <strong>Trick play</strong> — the player left of the dealer leads. You must follow the
            led suit if you can. If you cannot, you may click Reveal Trump to flip the hidden
            card; from then on the trump suit beats everything.
          </li>
          <li>
            <strong>Scoring</strong> — the bidding team must capture card points ≥ their bid.
          </li>
        </ol>
        <p className="modal-sub">
          Card ranking (high → low): J, 9, A, 10, K, Q, 8, 7 — worth 30, 20, 11, 10, 3, 2, 0, 0
          points. 4 suits × 76 points = 304 total points in play.
        </p>
        <p className="modal-sub">House rules used by this implementation:</p>
        <ul>
          <li>Trumping is allowed but never forced when void in the led suit.</li>
          <li>The trump applies to the entire trick in which it is revealed.</li>
          <li>On reveal, the concealed card returns to the bidder's hand.</li>
          <li>
            If nobody asks for the reveal, the trump flips automatically when the bidder must play
            their final (concealed) card, so all 304 points are always distributed.
          </li>
          <li>If all four players pass the auction, the same dealer redeals.</li>
        </ul>
        <button className="btn primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
