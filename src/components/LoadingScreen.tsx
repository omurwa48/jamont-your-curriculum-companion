import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated Logo */}
        <motion.div 
          className="relative mx-auto"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          
          {/* Orbiting Dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-secondary"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, 40, 0, -40, 0].map(x => x * Math.cos(i * (Math.PI * 2 / 3))),
                y: [0, -40, 0, 40, 0].map(y => y * Math.sin(i * (Math.PI * 2 / 3))),
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>

        {/* Loading Text */}
        <div className="space-y-2">
          <motion.h2 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Jamont
          </motion.h2>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {message}
          </motion.p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};
