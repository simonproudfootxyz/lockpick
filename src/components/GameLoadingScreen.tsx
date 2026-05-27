import LockpickLogo from "@/assets/LockpickLogo.svg";
import "./GameLoadingScreen.css";

export default function GameLoadingScreen() {
  return (
    <div className="game-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="game-loading__panel">
        <img
          className="game-loading__logo"
          src={LockpickLogo.src}
          alt="Lockpick"
        />
        <p className="game-loading__message">Setting up your game…</p>
        <div className="game-loading__bar" aria-hidden="true">
          <div className="game-loading__bar-fill" />
        </div>
      </div>
    </div>
  );
}
