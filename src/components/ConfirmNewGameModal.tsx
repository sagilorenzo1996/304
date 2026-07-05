interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmNewGameModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="overlay">
      <div className="modal">
        <h2>Start a new game?</h2>
        <p className="modal-sub">
          You have a game in progress. Starting a new game will discard it.
        </p>
        <div className="home-actions">
          <button className="btn danger" onClick={onConfirm}>
            Discard &amp; start new game
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
