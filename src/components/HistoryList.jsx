import Icon from './Icon.jsx';

export default function HistoryList({ history }) {
  if (history.length === 0) {
    return <p className="history-empty">Пока нет завершённых раундов — сыграйте первый!</p>;
  }

  return (
    <div className="history-list">
      {history.map((item, i) => (
        <div key={i} className="history-item">
          <span className={`history-badge theme-${item.theme}`} />
          {/* username+bet — один grid-элемент (иначе 5-й child ломает
              4-колоночный grid-template-columns на .history-item). */}
          <span className="history-main">
            {item.username && <span className="history-username">{item.username}</span>}
            <span className="history-bet">
              <Icon name="coin" tone="gold" size={18} />
              {item.betAmount}
            </span>
          </span>
          <span className="history-mult">
            {item.result === 'WIN'
              ? `×${item.cashoutMultiplier?.toFixed(2)}`
              : `×${item.crashMultiplier?.toFixed(2)}`}
          </span>
          <span className={`history-result ${item.result === 'WIN' ? 'win' : 'crash'}`}>
            {item.result === 'WIN' ? 'Забрал' : 'Crash'} · +{item.pointsEarned}
          </span>
        </div>
      ))}
    </div>
  );
}
