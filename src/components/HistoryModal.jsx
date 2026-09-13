import { motion } from 'framer-motion';
import HistoryList from './HistoryList.jsx';

export default function HistoryModal({ history, onClose }) {
  return (
    <motion.div
      className="overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3>История игр</h3>
          <button className="secondary-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <HistoryList history={history} />
      </motion.div>
    </motion.div>
  );
}
