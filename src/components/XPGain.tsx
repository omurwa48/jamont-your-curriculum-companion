import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface XPGainProps {
  amount: number;
  onComplete?: () => void;
}

export const XPGain = ({ amount, onComplete }: XPGainProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span className="text-2xl font-bold">+{amount} XP</span>
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};