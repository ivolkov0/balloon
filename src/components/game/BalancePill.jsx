import '../../styles/balance-pill.css';

/**
 * BalancePill — glossy blue currency pill (coin + value + "+" button).
 * Pure HTML/CSS: no images, no SVG, no canvas. The coin's rim, star and the
 * plus button's bevel are all drawn with gradients/box-shadow/pseudo-elements
 * in balance-pill.css.
 *
 * Props:
 * - value: number | string — the amount to display. Numbers are formatted
 *   with toLocaleString('ru-RU') (matches the rest of the app's thousands
 *   separator); pass a string if you want full control over formatting.
 * - onAdd: () => void — click handler for the "+" button. Omit to render it
 *   disabled (still visible, not interactive) — useful before a top-up flow
 *   exists.
 * - addLabel: string — accessible label for the icon-only "+" button.
 * - className: string — extra class(es) merged onto the root, for one-off
 *   layout tweaks (margins, grid placement) without editing this file.
 */
export default function BalancePill({ value = 0, onAdd, addLabel = 'Пополнить баланс', className = '' }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('ru-RU') : value;

  return (
    <div className={`balance-pill ${className}`.trim()}>
      <div className="balance-coin" aria-hidden="true">
        <div className="balance-coin-star">★</div>
      </div>

      <span className="balance-value">{displayValue}</span>

      <button type="button" className="balance-plus" onClick={onAdd} disabled={!onAdd} aria-label={addLabel}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
