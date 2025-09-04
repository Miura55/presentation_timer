'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
}

const PRESET_TIMES = [
  { label: '5分', minutes: 5 },
  { label: '10分', minutes: 10 },
  { label: '15分', minutes: 15 },
  { label: '20分', minutes: 20 },
  { label: '30分', minutes: 30 },
];

export default function PresentationTimer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // クエリパラメータから初期時間を取得
  const getInitialMinutes = () => {
    const timeParam = searchParams.get('time');
    if (timeParam) {
      const minutes = parseInt(timeParam, 10);
      if (!isNaN(minutes) && minutes > 0 && minutes <= 99) {
        return minutes;
      }
    }
    return 10; // デフォルト値
  };

  // URLのクエリパラメータを更新
  const updateURL = useCallback((minutes: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('time', minutes.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const initialMinutes = getInitialMinutes();
  const initialSeconds = initialMinutes * 60;

  const [timer, setTimer] = useState<TimerState>({
    totalSeconds: initialSeconds,
    remainingSeconds: initialSeconds,
    isRunning: false,
    isFinished: false,
  });
  const [customMinutes, setCustomMinutes] = useState<string>(initialMinutes.toString());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // クエリパラメータの変更を監視
  useEffect(() => {
    const newMinutes = getInitialMinutes();
    const newSeconds = newMinutes * 60;
    
    if (newMinutes !== timer.totalSeconds / 60 && !timer.isRunning) {
      setTimer({
        totalSeconds: newSeconds,
        remainingSeconds: newSeconds,
        isRunning: false,
        isFinished: false,
      });
      setCustomMinutes(newMinutes.toString());
    }
  }, [searchParams, timer.totalSeconds, timer.isRunning]);

  // ベル音を生成する関数
  const playBellSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Web Audio APIを使用してベル音を生成
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBell = (delay: number = 0) => {
        // ベル音のための複数の周波数
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const duration = 0.8; // 0.8秒間
        
        setTimeout(() => {
          frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.type = 'sine';
            
            // 音量のフェードイン・フェードアウト
            const startTime = audioContext.currentTime + index * 0.1;
            const endTime = startTime + duration;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
            
            oscillator.start(startTime);
            oscillator.stop(endTime);
          });
        }, delay);
      };
      
      // 3回ベルを鳴らす
      playBell(0);
      playBell(600);
      playBell(1200);
      
    } catch (error) {
      console.log('Audio playback not supported or failed:', error);
      // フォールバック: ブラウザのbeep音
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  }, [soundEnabled]);

  // タイマーの更新
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer.isRunning && timer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newRemaining = prev.remainingSeconds - 1;
          const isFinished = newRemaining === 0;
          
          // 時間終了時にベル音を鳴らす
          if (isFinished && !prev.isFinished) {
            playBellSound();
          }
          
          return {
            ...prev,
            remainingSeconds: newRemaining,
            isFinished,
            isRunning: newRemaining > 0,
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, timer.remainingSeconds, playBellSound]);

  // 時間の色を取得
  const getTimeColor = useCallback(() => {
    const percentage = (timer.remainingSeconds / timer.totalSeconds) * 100;
    if (timer.isFinished) return 'text-red-600';
    if (percentage <= 20) return 'text-red-500';
    if (percentage <= 50) return 'text-yellow-500';
    return 'text-green-500';
  }, [timer.remainingSeconds, timer.totalSeconds, timer.isFinished]);

  // 背景色を取得
  const getBackgroundColor = useCallback(() => {
    if (timer.isFinished) return 'bg-red-100';
    const percentage = (timer.remainingSeconds / timer.totalSeconds) * 100;
    if (percentage <= 20) return 'bg-red-50';
    if (percentage <= 50) return 'bg-yellow-50';
    return 'bg-green-50';
  }, [timer.remainingSeconds, timer.totalSeconds, timer.isFinished]);

  // 時間をフォーマット
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // タイマー開始/一時停止
  const toggleTimer = () => {
    if (timer.isFinished) return;
    setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  // タイマーリセット
  const resetTimer = () => {
    setTimer(prev => ({
      ...prev,
      remainingSeconds: prev.totalSeconds,
      isRunning: false,
      isFinished: false,
    }));
  };

  // プリセット時間の設定
  const setPresetTime = (minutes: number) => {
    const seconds = minutes * 60;
    setTimer({
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: false,
      isFinished: false,
    });
    setCustomMinutes(minutes.toString());
    updateURL(minutes);
  };

  // カスタム時間の設定
  const setCustomTime = () => {
    const minutes = parseInt(customMinutes, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 99) return;
    
    const seconds = minutes * 60;
    setTimer({
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: false,
      isFinished: false,
    });
    updateURL(minutes);
  };

  // 進捗率の計算
  const progressPercentage = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${getBackgroundColor()}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">プレゼンタイマー</h1>
            <p className="text-gray-600">発表時間を効率的に管理しましょう</p>
            <p className="text-sm text-gray-500 mt-2">
              URL例: <code className="bg-gray-100 px-2 py-1 rounded">?time=5</code> で5分に設定
            </p>
          </header>

          {/* メインタイマー表示 */}
          <div className="text-center mb-8">
            <div className="mb-2">
              <span className="text-lg text-gray-600">
                設定時間: {Math.floor(timer.totalSeconds / 60)}分
              </span>
            </div>
            <div className={`text-8xl md:text-9xl font-mono font-bold mb-4 transition-colors duration-500 ${getTimeColor()}`}>
              {formatTime(timer.remainingSeconds)}
            </div>
            
            {/* 進捗バー */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${
                  timer.isFinished ? 'bg-red-500' : 
                  progressPercentage >= 80 ? 'bg-red-400' :
                  progressPercentage >= 50 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>

            {/* 状態表示 */}
            {timer.isFinished && (
              <div className="text-2xl font-bold text-red-600 mb-4 animate-pulse">
                ⏰ 時間終了！
              </div>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={toggleTimer}
              disabled={timer.isFinished}
              className={`px-8 py-4 text-xl font-semibold rounded-lg transition-colors ${
                timer.isRunning
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
              }`}
            >
              {timer.isRunning ? '⏸️ 一時停止' : '▶️ 開始'}
            </button>
            
            <button
              onClick={resetTimer}
              className="px-8 py-4 text-xl font-semibold bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              🔄 リセット
            </button>
          </div>

          {/* 時間設定 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">時間設定</h2>
            
            {/* プリセット時間 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">プリセット時間</h3>
              <div className="flex flex-wrap gap-2">
                {PRESET_TIMES.map((preset) => (
                  <button
                    key={preset.minutes}
                    onClick={() => setPresetTime(preset.minutes)}
                    disabled={timer.isRunning}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* カスタム時間設定 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">カスタム時間</h3>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  disabled={timer.isRunning}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="text-gray-600">分</span>
                <button
                  onClick={setCustomTime}
                  disabled={timer.isRunning}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  設定
                </button>
              </div>
            </div>

            {/* 音声設定 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">音声設定</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    soundEnabled 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  {soundEnabled ? '🔊 音声ON' : '🔇 音声OFF'}
                </button>
                <button
                  onClick={playBellSound}
                  disabled={!soundEnabled}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  🔔 テスト再生
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                時間終了時にベル音が3回鳴ります
              </p>
            </div>

            {/* URL共有 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">URL共有</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    const currentUrl = window.location.href;
                    navigator.clipboard.writeText(currentUrl).then(() => {
                      alert('URLをクリップボードにコピーしました！');
                    }).catch(() => {
                      alert('URLのコピーに失敗しました');
                    });
                  }}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  📋 現在の設定でURLコピー
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                設定した時間でURLを共有できます
              </p>
            </div>
          </div>

          {/* フルスクリーンボタン */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              🖥️ フルスクリーン
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
