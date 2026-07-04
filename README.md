# 304 — Trick-Taking Card Game

A web implementation of **304**, the traditional South Asian trick-taking card
game. Phase 1 is a fully client-side app: you (South) partner with an AI
(North) against two AI opponents (East and West).

Built with **React + TypeScript + Vite**. The rules engine is a pure,
framework-free module, so it is unit-tested headlessly and ready to be reused
by a future multiplayer server.

## Running locally

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm test         # run the engine/AI test suite (vitest)
npm run build    # type-check and produce a production build
```

## How to play

1. **First deal** — everyone receives 4 cards.
2. **Bidding** — starting left of the dealer, players bid (minimum 200, raises
   in steps of 10, maximum 304) or pass. A pass is final. The highest bidder
   wins the right to set the trump. If all four players pass, the hand is
   redealt.
3. **Trump selection** — the bidder places one card from their hand **face
   down**; its suit is the secret trump.
4. **Second deal** — 4 more cards each (the bidder plays one card short until
   the trump is revealed).
5. **Trick play** — the player left of the dealer leads. You must follow the
   led suit if you can. If you cannot, you may click **Reveal Trump** to flip
   the hidden card; from then on the trump suit beats everything.
6. **Scoring** — the bidding team must capture card points ≥ their bid.

### Card ranking & points (per suit, high → low)

| Card | J  | 9  | A  | 10 | K | Q | 8 | 7 |
|------|----|----|----|----|---|---|---|---|
| Pts  | 30 | 20 | 11 | 10 | 3 | 2 | 0 | 0 |

4 suits × 76 points = **304** total points in play.

### House rules used by this implementation

- Trumping is **allowed but never forced** when void in the led suit.
- The trump applies to the **entire trick** in which it is revealed.
- On reveal, the concealed card returns to the bidder's hand.
- If nobody asks for the reveal, the trump flips **automatically** when the
  bidder must play their final (concealed) card, so all 304 points are always
  distributed.
- If all four players pass the auction, the same dealer redeals.

## Project structure

```
src/
  game/               # pure, framework-free game logic
    types.ts          # cards, seats, teams, point/rank tables
    deck.ts           # 32-card deck, shuffling, seedable RNG
    rules.ts          # trick evaluation & legal-move rules
    engine.ts         # the state machine: bidding → trump → tricks → scoring
    ai.ts             # bidding/playing AI for the three bot seats
    game.test.ts      # engine + AI test suite (full-round simulations)
  hooks/
    useGame.ts        # React reducer + AI/trick-sweep scheduler
  components/
    Table.tsx         # felt table, seats, hands, reveal button
    TrickArea.tsx     # center of the table with slide/sweep animations
    CardView.tsx      # a single playing card (face up/down)
    BiddingModal.tsx  # bidding overlay
    TrumpSelectModal.tsx
    RoundEndModal.tsx
    Scoreboard.tsx    # persistent team score / bid / trump panel
  App.tsx
  main.tsx
  styles.css
```

## AI overview

- **Bidding** (`chooseBid`) — scores the strongest suit of the first four
  cards (card points + length bonus, discounted without the J/9) and raises
  in minimum steps while the hand justifies it.
- **Trump choice** (`chooseTrumpCard`) — picks the strongest suit and conceals
  its *lowest* card, keeping the big trumps in hand.
- **Play** (`choosePlay`) — follows suit with the cheapest winning card,
  throws 7s/8s when it cannot win, feeds point cards (10s, Aces) to a partner
  who has the trick locked up, requests the trump reveal when void with a
  strong side suit, and trumps in on point-rich tricks once the trump is out.
- The AI is information-honest: only the bidder knows the trump before the
  reveal, and nobody looks at hidden hands.

## Roadmap (later phases)

- Match play to a target of game points, kaput/double-kaput bonuses
- Online multiplayer (the pure engine is transport-ready)
- Sound effects, richer card art, mobile layout polish
