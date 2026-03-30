import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, Target, Award, Play, RotateCcw, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { texts, getTitle, getLevel, calcXP, getXPProgress, getAllIndiaRank } from './utils/typingUtils';
import './index.css';

const App = () => {
  // Auth State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '', remember: false });
  const [error, setError] = useState('');

  // Game State
  const [currentText, setCurrentText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalWords, setTotalWords] = useState(0);
  const [sessionCorrectChars, setSessionCorrectChars] = useState(0);
  const [sessionTypedChars, setSessionTypedChars] = useState(0);
  
  // Stats State
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [totalXP, setTotalXP] = useState(0);
  const [bestWpm, setBestWpm] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [highSpeedStreak, setHighSpeedStreak] = useState(0);

  const inputRef = useRef(null);

  // Initialize User Session
  useEffect(() => {
    if (user) {
      const userData = JSON.parse(localStorage.getItem(`user_${user.username}`)) || { xp: 0, best: 0, streak: 0 };
      setTotalXP(userData.xp);
      setBestWpm(userData.best);
      setHighSpeedStreak(userData.streak || 0);
      resetGame();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      setError('Please fill in all fields');
      return;
    }

    if (authMode === 'signup') {
      const existing = localStorage.getItem(`user_${loginForm.username}`);
      if (existing) {
        setError('Username already exists');
        return;
      }
      const newUser = { username: loginForm.username, password: loginForm.password };
      localStorage.setItem(`user_${loginForm.username}`, JSON.stringify({ ...newUser, xp: 0, best: 0 }));
      setUser(newUser);
      if (loginForm.remember) localStorage.setItem('currentUser', JSON.stringify(newUser));
    } else {
      const stored = localStorage.getItem(`user_${loginForm.username}`);
      if (!stored) {
        setError('User not found');
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.password !== loginForm.password) {
        setError('Incorrect password');
        return;
      }
      setUser(parsed);
      if (loginForm.remember) localStorage.setItem('currentUser', JSON.stringify(parsed));
    }
    setError('');
  };

  // Persist User Data
  useEffect(() => {
    if (user) {
      const data = { xp: totalXP, best: bestWpm, streak: highSpeedStreak, username: user.username, password: user.password };
      localStorage.setItem(`user_${user.username}`, JSON.stringify(data));
      if (localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    }
  }, [totalXP, bestWpm, highSpeedStreak, user]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (startTime && !isFinished && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            finishGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const finishGame = () => {
    setIsFinished(true);
    setEndTime(Date.now());
    
    // Update Best WPM
    if (wpm > bestWpm) {
      setBestWpm(wpm);
      triggerLevelUpCelebration(); // Confetti for personal best
    }

    // Milestone Check: 32 WPM x 3 times
    let streakBonus = 0;
    if (wpm >= 32) {
      const newStreak = highSpeedStreak + 1;
      setHighSpeedStreak(newStreak);
      if (newStreak % 3 === 0) {
        streakBonus = 500; // Level-up bonus
        triggerLevelUpCelebration();
      }
    }

    const earnedXP = calcXP(wpm, accuracy) + streakBonus;
    setTotalXP(prev => {
      const newXP = prev + earnedXP;
      if (getLevel(newXP) > getLevel(prev)) {
        triggerLevelUpCelebration();
      }
      return newXP;
    });
  };

  const resetGame = () => {
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    setCurrentText(randomText);
    setUserInput("");
    setStartTime(null);
    setEndTime(null);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setTimeLeft(60); // 1 minute challenge
    setTotalWords(0);
    setSessionCorrectChars(0);
    setSessionTypedChars(0);
    setCombo(0);
    setMaxCombo(0);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (isFinished) return;

    if (!startTime) {
      setStartTime(Date.now());
    }

    setUserInput(value);

    // Filter only correctly typed words
    const userWords = value.trim().split(/\s+/).filter(w => w !== "");
    const targetWords = currentText.trim().split(/\s+/);
    let correctCount = 0;
    userWords.forEach((word, i) => {
      if (word === targetWords[i]) correctCount++;
    });

    // Calculate real-time stats (only counting correct words)
    const sessionWords = totalWords + correctCount;
    const now = Date.now();
    const effectiveStartTime = startTime || now;
    const timeElapsed = (now - effectiveStartTime) / 1000 / 60; // minutes
    
    if (timeElapsed > 0 && sessionWords > 0) {
      setWpm(Math.round(sessionWords / timeElapsed));
    }

    // Calculate accuracy and combo
    const lastChar = value[value.length - 1];
    if (lastChar === currentText[value.length - 1]) {
      setCombo(prev => {
        const next = prev + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
    } else {
      setCombo(0);
    }

    const currentCorrect = value.split('').filter((char, i) => char === currentText[i]).length;
    const totalCorrect = sessionCorrectChars + currentCorrect;
    const totalTyped = sessionTypedChars + value.length;
    
    if (totalTyped > 0) {
      setAccuracy(Math.round((totalCorrect / totalTyped) * 100));
    }

    // Auto-next task check
    if (value.length >= currentText.length) {
      setTotalWords(prev => prev + correctCount);
      setSessionCorrectChars(prev => prev + currentCorrect);
      setSessionTypedChars(prev => prev + value.length);
      const nextText = texts[Math.floor(Math.random() * texts.length)];
      setCurrentText(nextText);
      setUserInput("");
    }
  };

  const triggerLevelUpCelebration = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#22d3ee', '#fb7185']
    });
  };

  const currentLevel = getLevel(totalXP);
  const progress = getXPProgress(totalXP);
  const title = getTitle(wpm);
  const airRank = getAllIndiaRank(wpm);

  if (!user) {
    return (
      <div className="login-container">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel login-card"
        >
          <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="title-gradient" style={{ fontSize: '2.5rem' }}>HELP TO TYPE</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Welcome back! Sign in to continue.' : 'Join the elite typist community!'}
            </p>
          </header>

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label>Choose Username</label>
              <input 
                type="text" 
                value={loginForm.username} 
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="Username (e.g. typing_pro)"
                className="custom-input"
              />
            </div>
            <div className="form-group">
              <label>{authMode === 'login' ? 'Password' : 'Set Password'}</label>
              <input 
                type="password" 
                value={loginForm.password} 
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="custom-input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={loginForm.remember} 
                onChange={(e) => setLoginForm({ ...loginForm, remember: e.target.checked })}
                id="remember"
              />
              <label htmlFor="remember" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Keep me logged in</label>
            </div>
            
            {error && <p style={{ color: 'var(--accent)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
            
            <button className="btn-primary" type="submit" style={{ fontSize: '1.1rem', padding: '16px' }}>
              {authMode === 'login' ? 'Proceed to Type' : 'Create My Account'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '2rem', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {authMode === 'login' ? "First time here?" : "Already have an account?"}
            </p>
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="btn-secondary"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--glass-border)', 
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                width: '100%',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {authMode === 'login' ? 'Sign Up for Free' : 'Back to Login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="main-container"
    >
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.username}</div>
          <button onClick={handleLogout} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Logout</button>
        </div>
        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
          {user.username[0].toUpperCase()}
        </div>
      </div>

      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <motion.h1 
          className="title-gradient"
          style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          HELP TO TYPE
        </motion.h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
          1 Minute Marathon • Only Correct Words Count
        </p>
      </header>


      <div className="stats-grid">
        <StatCard icon={<Timer size={20} />} label="Remaining" value={timeLeft + "s"} color={timeLeft < 10 ? "var(--accent)" : "var(--primary)"} />
        <StatCard icon={<Zap size={20} />} label="AIR Rank" value={airRank} color="var(--secondary)" />
        <StatCard icon={<TrendingUp size={20} />} label="WPM" value={wpm} color="var(--success)" />
        <StatCard icon={<Target size={20} />} label="Accuracy" value={accuracy + "%"} color="var(--warning)" />
        <StatCard icon={<Award size={20} />} label="Max Combo" value={maxCombo} color="var(--accent)" />
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div 
          className="typing-area"
          onClick={() => inputRef.current?.focus()}
          style={{ cursor: 'text', position: 'relative' }}
        >
          <AnimatePresence>
            {combo > 0 && (
              <motion.div 
                key={combo}
                initial={{ scale: 0.8, opacity: 0, x: 20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 1.2, opacity: 0 }}
                style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: -40, 
                  color: 'var(--primary)', 
                  fontWeight: 'bold', 
                  fontSize: '1.5rem',
                  textShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
                }}
              >
                {combo} COMBO
              </motion.div>
            )}
          </AnimatePresence>
          {currentText.split('').map((char, index) => {
            let className = "char";
            if (index < userInput.length) {
              className += (userInput[index] === char) ? " char-correct" : " char-incorrect";
            } else if (index === userInput.length) {
              className += " char-active";
            }
            return <span key={index} className={className}>{char}</span>;
          })}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isFinished}
          style={{ 
            opacity: 0, 
            position: 'absolute', 
            zIndex: -1 
          }}
          autoFocus
        />

        {!isFinished ? (
          <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            {!isFocused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: 'var(--warning)', fontWeight: 'bold', marginBottom: '0.5rem' }}
              >
                Click typing area to focus
              </motion.div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={16} /> Start typing to begin the challenge
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center' }}
          >
            {wpm >= 32 && highSpeedStreak > 0 && highSpeedStreak % 3 === 0 && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ color: 'var(--secondary)', fontWeight: '700', marginBottom: '1rem' }}
              >
                🔥 MASTERY BONUS: 3rd Time at 32+ WPM! LVL UP!
              </motion.div>
            )}
            {wpm >= 30 ? (
              <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>FANTASTIC!</h2>
            ) : (
              <h2 style={{ color: 'var(--warning)', marginBottom: '0.5rem', fontSize: '2rem' }}>GOOD EFFORT!</h2>
            )}
            <div style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
              You typed <strong>{totalWords} perfect words</strong> • Streak: {highSpeedStreak}
            </div>
            <p style={{ color: 'var(--primary)', fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '1.6rem' }}>
              Final Speed: {wpm} WPM | AIR Rank: {airRank}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={resetGame} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={18} /> Experience Again
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Gamification footer */}
      <footer className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <div className="level-badge">LVL {currentLevel}</div>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>Progress to Level {currentLevel + 1}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            <motion.div 
              style={{ height: '100%', background: 'linear-gradient(to right, var(--primary), var(--secondary))' }}
              initial={{ width: 0 }}
              animate={{ width: progress + '%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total XP</div>
          <div style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '1.2rem' }}>{totalXP}</div>
        </div>
      </footer>
    </motion.div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="stat-card"
  >
    <div style={{ color, display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
  </motion.div>
);

export default App;
