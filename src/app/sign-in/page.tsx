import SignInForm from "@/components/auth/SignInForm";
import "@/GameSetup.css";

export default function SignInPage() {
  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Sign in</h1>
        <SignInForm />
      </div>
    </div>
  );
}
