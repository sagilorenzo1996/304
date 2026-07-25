import { Card, Suit } from '../game/types';

const SUIT_CHAR: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS: Suit[] = ['H', 'D'];

interface Props {
  card?: Card;
  faceDown?: boolean;
  /** Face-down, but with the rank/suit faintly visible through the back —
   *  for a concealed card whose identity this viewer is allowed to know. */
  peek?: boolean;
  small?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function CardView({ card, faceDown, peek, small, disabled, onClick, style, className }: Props) {
  const classes = ['card'];
  if (small) classes.push('small');
  if (faceDown || !card) classes.push('back');
  else classes.push(RED_SUITS.includes(card.suit) ? 'red' : 'black');
  if (faceDown && peek && card) classes.push('peek');
  if (disabled) classes.push('disabled');
  if (onClick && !disabled) classes.push('clickable');
  if (className) classes.push(className);

  return (
    <div
      className={classes.join(' ')}
      style={style}
      onClick={disabled ? undefined : onClick}
      role={onClick ? 'button' : undefined}
    >
      {(!faceDown || peek) && card && (
        <>
          <div className="corner tl">
            <span>{card.rank}</span>
            <span>{SUIT_CHAR[card.suit]}</span>
          </div>
          <div className="pip">{SUIT_CHAR[card.suit]}</div>
          <div className="corner br">
            <span>{card.rank}</span>
            <span>{SUIT_CHAR[card.suit]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export const suitChar = (suit: Suit) => SUIT_CHAR[suit];
export const isRedSuit = (suit: Suit) => RED_SUITS.includes(suit);
