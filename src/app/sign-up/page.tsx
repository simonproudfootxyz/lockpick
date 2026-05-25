import SignUpForm from "@/components/auth/SignUpForm";
import "@/GameSetup.css";

export default function SignUpPage() {
  return (
    <div className="game-setup">
      <div className="setup-container">
        <h1>Create account</h1>
        <SignUpForm />
      </div>
    </div>
  );
}
