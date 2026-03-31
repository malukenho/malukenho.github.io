import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, CheckCircle, BookOpen, Clock, Brain, Download, ChevronRight, ChevronDown, Plus, Trash2, AlertCircle } from 'lucide-react';

/**
 * UTILITY: Average reading speed heuristic
 * Average speaking rate is approx 150 words per minute.
 * We use this to slice the raw transcript text based on video timestamps.
 */
const WORDS_PER_MINUTE = 150;

const StudyApp = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [isSetupDone, setIsSetupDone] = useState(false);
  
  // Player State
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [lastQuizTime, setLastQuizTime] = useState(0);
  
  // Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [allFlashcards, setAllFlashcards] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]); // Array of { time, questions }

  // Refs for dirty checking interval
  const timeRef = useRef(0);
  
  // --- Initialization & API ---

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSetupComplete = () => {
    const id = extractVideoId(videoUrl);
    if (id && transcript.length > 50) {
      setVideoId(id);
      setIsSetupDone(true);
    } else {
      alert("Please enter a valid YouTube URL and a transcript.");
    }
  };

  const generateQuestions = async (segmentText) => {
    if (!apiKey) return getMockQuestions(); // Fallback for demo without key

    setIsLoadingQuestions(true);
    try {
      const prompt = `
        You are a study tutor. Based on the following video transcript segment, generate 3-5 conceptual study questions.
        Return ONLY a raw JSON array of objects with 'question' and 'answer' keys. Do not use Markdown formatting.
        
        Transcript Segment:
        "${segmentText}"
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Clean up markdown code blocks if present
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("API Error", error);
      return [{ question: "Error generating questions", answer: "Check API Key or Network" }];
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const getMockQuestions = () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          { question: "What is the main concept discussed in this minute?", answer: "This is a placeholder answer since no API key was provided." },
          { question: "How does this relate to the previous topic?", answer: "Mock answer for demonstration." },
          { question: "Identify the key term mentioned.", answer: "Mock Key Term" }
        ]);
      }, 1500);
    });
  };

  // --- Video Logic ---

  useEffect(() => {
    if (!isSetupDone || !videoId) return;

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      const newPlayer = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'playsinline': 1,
          'controls': 1,
          'modestbranding': 1
        },
        events: {
          'onReady': (e) => {
            setPlayer(e.target);
            setDuration(e.target.getDuration());
          },
          'onStateChange': (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          }
        }
      });
    };
  }, [isSetupDone, videoId]);

  // Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (player && isPlaying && !isQuizActive) {
        const t = player.getCurrentTime();
        setCurrentTime(t);
        timeRef.current = t;

        // Check if we hit the interval
        const secondsSinceLastQuiz = t - lastQuizTime;
        if (secondsSinceLastQuiz >= intervalMinutes * 60 && t > 5) {
            triggerQuiz(t);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [player, isPlaying, lastQuizTime, intervalMinutes, isQuizActive, transcript]);

  const triggerQuiz = async (currentTime) => {
    if (!player) return;
    
    player.pauseVideo();
    setIsQuizActive(true);
    setLastQuizTime(currentTime);

    // Slice Transcript
    // Logic: Get text from (LastQuizTime) to (CurrentTime)
    // Convert time to approx word count
    const startWord = Math.floor((lastQuizTime / 60) * WORDS_PER_MINUTE);
    const endWord = Math.floor((currentTime / 60) * WORDS_PER_MINUTE);
    
    const words = transcript.split(/\s+/);
    const segmentText = words.slice(startWord, endWord).join(" ");

    // If segment is too short, just grab a generic chunk around the current time
    const textToSend = segmentText.length < 50 
        ? words.slice(Math.max(0, endWord - 150), endWord).join(" ")
        : segmentText;

    const questions = await generateQuestions(textToSend);
    setCurrentQuestions(questions);
  };

  const handleResume = () => {
    // Save current questions to history
    const newHistory = {
        timestamp: new Date().toISOString(),
        videoTime: lastQuizTime,
        questions: currentQuestions
    };
    
    setAllFlashcards(prev => [...prev, ...currentQuestions]);
    setQuizHistory(prev => [...prev, newHistory]);
    
    setIsQuizActive(false);
    setCurrentQuestions([]);
    if(player) player.playVideo();
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allFlashcards, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "study_flashcards.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- RENDER ---

  if (!isSetupDone) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
        <div className="max-w-2xl mx-auto mt-10 bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8" /> 
              Video Study Companion
            </h1>
            <p className="opacity-90 mt-2">Turn any YouTube video into an interactive study session.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">1. Gemini API Key (Optional)</label>
              <input 
                type="password" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Required for AI question generation..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Without a key, the app will use placeholder mock data.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">2. YouTube Video URL</label>
              <input 
                type="text" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                3. Paste Video Transcript
                <span className="ml-2 font-normal text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Required</span>
              </label>
              <div className="text-xs text-slate-500 mb-2 bg-slate-100 p-2 rounded">
                <strong>Why?</strong> Browser security prevents us from auto-downloading transcripts. 
                Please open the video on YouTube, click "Show Transcript", and copy/paste all text here.
              </div>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg h-48 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="Paste the full transcript text here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              ></textarea>
            </div>

            <button 
              onClick={handleSetupComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Start Studying <ChevronRight className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
          <Brain className="w-6 h-6" />
          <span>StudyMode</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Pause every:</span>
            <select 
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="bg-transparent font-semibold outline-none text-blue-600 cursor-pointer"
            >
              <option value={1}>1 min</option>
              <option value={2}>2 mins</option>
              <option value={5}>5 mins</option>
              <option value={10}>10 mins</option>
            </select>
          </div>
          <button 
             onClick={() => {
                 setIsSetupDone(false);
                 setVideoId(null);
             }}
             className="text-sm text-slate-500 hover:text-red-500 font-medium"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left: Video Area */}
        <div className={`flex-1 bg-black relative flex flex-col justify-center transition-all duration-300 ${isQuizActive ? 'blur-sm brightness-50' : ''}`}>
           <div id="youtube-player" className="w-full h-full absolute inset-0"></div>
           {/* Overlay blocker to prevent interaction during quiz */}
           {isQuizActive && <div className="absolute inset-0 z-20 bg-transparent cursor-not-allowed"></div>}
        </div>

        {/* Right: Notes / Flashcards Sidebar */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col h-[40vh] md:h-full z-10 shadow-xl">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h2 className="font-bold text-slate-700 flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-blue-500" />
               Flashcards
             </h2>
             <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
               {allFlashcards.length} Generated
             </span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {allFlashcards.length === 0 ? (
               <div className="text-center text-slate-400 mt-10">
                 <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                 <p className="text-sm">Questions will appear here after each interval.</p>
               </div>
             ) : (
               allFlashcards.map((card, idx) => (
                 <Flashcard key={idx} data={card} index={idx} />
               ))
             )}
           </div>

           <div className="p-4 border-t border-slate-100 bg-slate-50">
             <button 
               onClick={handleExport}
               disabled={allFlashcards.length === 0}
               className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
             >
               <Download className="w-4 h-4" /> Export Flashcards
             </button>
           </div>
        </div>

        {/* QUIZ MODAL OVERLAY */}
        {isQuizActive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
                 <h2 className="text-2xl font-bold mb-1">Time for a Check-in!</h2>
                 <p className="text-blue-100 text-sm">Reviewing concepts from the last {intervalMinutes} minute(s)</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                 {isLoadingQuestions ? (
                   <div className="flex flex-col items-center justify-center py-10 space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Analyzing transcript & generating questions...</p>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      {currentQuestions.map((q, i) => (
                        <QuizItem key={i} question={q.question} answer={q.answer} index={i} />
                      ))}
                   </div>
                 )}
              </div>

              {!isLoadingQuestions && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button 
                    onClick={handleResume}
                    className="bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 px-12 rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" /> Continue Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-component for individual Quiz Items in the modal
const QuizItem = ({ question, answer, index }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 text-lg mb-3">{question}</h3>
          
          {revealed ? (
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-slate-700 animate-in fade-in slide-in-from-top-2">
              <span className="text-green-700 font-bold text-xs uppercase tracking-wider mb-1 block">Answer</span>
              {answer}
            </div>
          ) : (
            <button 
              onClick={() => setRevealed(true)}
              className="text-blue-600 text-sm font-medium hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              Show Answer <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for sidebar Flashcards
const Flashcard = ({ data, index }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm hover:border-blue-300 transition-colors cursor-pointer group" onClick={() => setExpanded(!expanded)}>
      <div className="font-medium text-slate-800 mb-1 flex justify-between gap-2">
        <span>Q: {data.question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
           <span className="font-bold text-xs text-slate-400 block mb-1">ANSWER</span>
           {data.answer}
        </div>
      )}
    </div>
  );
}

export default StudyApp;
