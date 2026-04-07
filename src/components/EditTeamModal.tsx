import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string, newPlayers: string[]) => void;
  currentName: string;
  currentPlayers: string[];
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, onClose, onSave, currentName, currentPlayers }) => {
  const [name, setName] = useState(currentName);
  const [player1, setPlayer1] = useState(currentPlayers[0] || '');
  const [player2, setPlayer2] = useState(currentPlayers[1] || '');

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setPlayer1(currentPlayers[0] || '');
      setPlayer2(currentPlayers[1] || '');
    }
  }, [isOpen, currentName, currentPlayers]);

  const handleSave = () => {
    onSave(name, [player1, player2]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel p-6 w-full max-w-md relative z-10 border border-neon-blue/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 drop-shadow-neon-blue">Modifica Squadra</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Squadra (opzionale)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                  placeholder="Es. I Leoni"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Giocatore 1</label>
                <input
                  type="text"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Giocatore 2</label>
                <input
                  type="text"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-neon-blue text-black font-bold rounded hover:bg-white transition-colors shadow-neon-blue"
              >
                Salva
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditTeamModal;
