import React from "react";
import "./RulesContent.css";

const combineClassNames = (...classNames) =>
  classNames.filter(Boolean).join(" ");

const RulesContent = ({ className = "" }) => {
  const containerClass = combineClassNames("rules-content", className);

  return (
    <div className={containerClass}>
      <section className="rules-section game-objective">
        <h3>Team Objective</h3>
        <p>
          Four shared discard piles sit at the center of every Lockpick match:
          two climb upward from 1 while two fall from the high anchor (100 in
          smaller games, or the current max card + 1 once the deck stretches
          past 99). Everyone cooperates to drain the tailored deck, which always
          includes every number from 2 up to that max value (99 with up to five
          players, then +10 for each player beyond five).
        </p>
        <p>
          Keep the piles flexible by making small jumps whenever you can, and
          tap <code>View</code> on any pile to review its full history before
          committing to a play.
        </p>
      </section>

      <section className="rules-section pile-rules">
        <h3>Discard Piles</h3>
        <ul>
          <li>
            <strong>Ascending piles (1 ↑):</strong> Each card must be higher
            than the top card already showing. Tight gaps preserve the most
            future plays.
          </li>
          <li>
            <strong>Descending piles (max ↓):</strong> Each card must be lower
            than the top card to keep the stack counting down.
          </li>
          <li>
            <strong>Pile visibility:</strong> Use the <code>View</code> control
            whenever you need to confirm the order of cards on a pile.
          </li>
        </ul>
      </section>

      <section className="rules-section setup-rules">
        <h3>Getting Started</h3>
        <ul>
          <li>
            Choose the player count to size the deck and seating order. In
            multiplayer, the lobby host always takes the first turn.
          </li>
          <li>
            The deck includes every number from 2 through the current maximum.
            With six or more players, the max grows by ten per additional player
            (e.g. 109 with six players, 119 with seven).
          </li>
          <li>
            Everyone draws an opening hand according to the table size. Discard
            piles begin empty until the first cards are played.
          </li>
        </ul>
        <div className="hand-sizes">
          <h3>Starting hand sizes</h3>
          <ul>
            <li>1 player: 8 cards</li>
            <li>2 players: 7 cards each</li>
            <li>3–5 players: 6 cards each</li>
            <li>6–10 players: 5 cards each</li>
          </ul>
        </div>
      </section>

      <section className="rules-section gameplay-rules">
        <h3>Turn Flow</h3>
        <ul>
          <li>
            While the draw pile still contains cards, you must play at least{" "}
            <strong>two</strong> cards on your turn. Once it is empty, only{" "}
            <strong>one</strong> card is required.
          </li>
          <li>
            Play cards one at a time, mixing piles in any order as long as you
            respect the ascending or descending direction of each stack.
          </li>
          <li>
            After meeting your requirement, press{" "}
            <code>End Turn &amp; Draw Cards</code> to replenish from the draw
            pile (if available) and pass play to the next teammate.
          </li>
          <li>
            If you have no legal moves, use <code>I can't play a card</code> to
            concede the run for the entire team.
          </li>
        </ul>
      </section>

      <section className="rules-section special-rules">
        <h3>Backtrack Maneuver (±10)</h3>
        <p>
          Break the normal direction when your card is exactly ten away from the
          top card of a pile. You can use the maneuver multiple times per turn
          and across different piles.
        </p>
        <ul>
          <li>
            <strong>Ascending pile:</strong> Play a card exactly 10 lower than
            the top card (e.g. play 37 onto 47 or 56 onto 66).
          </li>
          <li>
            <strong>Descending pile:</strong> Play a card exactly 10 higher than
            the top card (e.g. play 108 onto 98 or 55 onto 45).
          </li>
        </ul>
      </section>

      <section className="rules-section communication-rules">
        <h3>Communication</h3>
        <p>
          Coordinate freely, but never reveal or request exact card numbers.
          Qualitative hints such as “leave the right pile alone” or “small jumps
          help here” are allowed; anything that narrows to a specific value is
          not.
        </p>
      </section>

      <section className="rules-section endgame-rules">
        <h3>Endgame</h3>
        <ul>
          <li>
            When the draw pile runs out, keep playing without drawing. The
            minimum requirement stays at one card per turn.
          </li>
          <li>
            The team wins immediately when the final card from the deck lands on
            a pile.
          </li>
          <li>
            If anyone cannot meet the minimum play on their turn, the expedition
            fails and the game ends.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default RulesContent;
