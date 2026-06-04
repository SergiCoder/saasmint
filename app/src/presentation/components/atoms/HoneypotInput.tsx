/**
 * Off-screen honeypot input for spam bots. Positioned `-left-[9999px]`
 * (NOT `display:none`) so well-behaved bots that skip hidden fields will
 * still fill it in. Real users tab past it (`tabIndex={-1}`) and screen
 * readers ignore it (`aria-hidden`). The server action short-circuits when
 * the field has any value.
 */
export function HoneypotInput() {
  return (
    <input
      type="text"
      name="honeypot"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute -left-[9999px] h-0 w-0 opacity-0"
    />
  );
}
