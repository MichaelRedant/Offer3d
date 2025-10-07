import { useNavigate } from "react-router-dom";

export default function TerminalBackButton({
  to,
  label = "Terug",
  className = "",
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`terminal-button is-ghost terminal-back-button ${className}`}
      aria-label={label}
    >
      <span className="terminal-back-button__indicator">{"<<"}</span>
      <span>{label}</span>
    </button>
  );
}
