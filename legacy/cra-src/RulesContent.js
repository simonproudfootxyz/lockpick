import React from "react";
import "./RulesContent.css";
import MagnifyingGlass from "./assets/MagnifyingGlass.svg";
import { TextButton } from "./components/Button";

const combineClassNames = (...classNames) =>
  classNames.filter(Boolean).join(" ");

const RulesContent = ({ className = "" }) => {
  const containerClass = combineClassNames("rules-content", className);

  return (
    <div className={containerClass}>
      <section className="rules-section game-objective">
        <h3>How to Play</h3>
        <p>
          Lockpick is a solo card game — think solitaire with numbers. Your goal
          is to play every card from the deck onto four shared piles: two count
          up from 1, and two count down from 100. The deck contains every number
          from <strong>2 to 99</strong> (98 cards total) Play at least two cards
          per turn, and try to empty the whole deck before you run out of legal
          moves.
        </p>
      </section>

      <section className="rules-section setup-rules">
        <h3>Getting Started</h3>
        <ul>
          <li>
            You start with a hand of <strong>8 cards</strong>. The four discard
            piles begin empty
          </li>
          <li>
            You must play <strong>at least two cards</strong> per turn (unless
            the deck is empty, in which case you only need to play one card)
          </li>
          <li>
            Tap{" "}
            <code>
              X Cards <img src={MagnifyingGlass} alt="Magnifying Glass" />
            </code>{" "}
            on any pile to see its full history before you play
          </li>
          <li>
            <strong>Ascending piles (1 ↑):</strong> Each card must be higher
            than the top card. Smaller jumps leave more room for future plays
          </li>
          <li>
            <strong>Descending piles (100 ↓):</strong> Each card must be lower
            than the top card
          </li>
          <li>
            You can play on any pile in any order during your turn, as long as
            each play follows the pile's direction
          </li>
        </ul>
      </section>

      <section className="rules-section special-rules">
        <h3>Backtrack (±10)</h3>
        <p>
          Normally you follow each pile's direction, but you can play a card
          that is <code>exactly 10 away in the wrong direction</code>. This is
          called a backtrack, and it's often what keeps a game alive.
        </p>
        <ul>
          <li>
            <strong>Ascending pile:</strong> Play a card{" "}
            <strong>
              exactly 10 <em>lower</em>
            </strong>{" "}
            than the top card (e.g. play <strong>37</strong> onto{" "}
            <strong>47</strong>, or <strong>56</strong> onto <strong>66</strong>
            )
          </li>
          <li>
            <strong>Descending pile:</strong> Play a card{" "}
            <strong>
              exactly 10 <em>higher</em>
            </strong>{" "}
            than the top card (e.g. play <strong>55</strong> onto{" "}
            <strong>45</strong>, or <strong>88</strong> onto <strong>78</strong>
            )
          </li>
        </ul>
        <p>
          You can backtrack multiple times in a single turn, on the same pile or
          different ones. Save them for when a pile is getting tight — that's
          where they matter most.
        </p>
      </section>

      <section className="rules-section gameplay-rules">
        <h3>Your Turn</h3>
        <ul>
          <li>
            While cards remain in the deck, you must play at least{" "}
            <strong>two</strong> cards. Once the deck is empty, you only need to
            play <strong>one</strong>
          </li>
          <li>Play cards one at a time onto any legal pile.</li>
          <li>
            When you've met the minimum, press{" "}
            <code>End Turn &amp; Draw Cards</code> to refill your hand from the
            deck (if any cards remain)
          </li>
          <li>
            If you have no legal moves, press <code>I Can't Play A Card</code>{" "}
            to end the game
          </li>
        </ul>
      </section>

      <section className="rules-section endgame-rules">
        <h3>Winning &amp; Losing</h3>
        <ul>
          <li>
            <strong>You win</strong> when the last card from the deck is played
            onto a pile
          </li>
          <li>
            <strong>You lose</strong> if you can't meet the minimum play
            requirement on your turn
          </li>
          <li>
            Once the deck runs out, keep playing without drawing. The minimum
            stays at one card per turn until the deck is cleared or you're stuck
          </li>
        </ul>
      </section>
    </div>
  );
};

export default RulesContent;
