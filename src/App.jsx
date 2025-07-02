import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// Audio Engine
class AudioEngine {
  constructor() {
    this.synth = new Tone.PolySynth().toDestination();
    this.isStarted = false;
  }

  async start() {
    if (!this.isStarted) {
      await Tone.start();
      this.isStarted = true;
    }
  }

  playChord(notes, duration = '4n') {
    this.synth.triggerAttackRelease(notes, duration);
  }

  playNote(note, duration = '8n') {
    this.synth.triggerAttackRelease(note, duration);
  }
}

// Chord and Scale Data
const CHORD_TYPES = {
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'min7b5': [0, 3, 6, 10],
  'dim7': [0, 3, 6, 9],
  'maj': [0, 4, 7],
  'min': [0, 3, 7]
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const JAZZ_STANDARDS = [
  {
    title: "Autumn Leaves",
    key: "G",
    progression: ["Cmaj7", "F#min7b5", "B7", "Emin7", "Amin7", "D7", "Gmaj7", "Gmaj7"]
  },
  {
    title: "All The Things You Are",
    key: "G#", 
    progression: ["Fmin7", "A#min7", "D#7", "G#maj7", "C#maj7", "Dmin7b5", "G7", "Cmaj7"]
  },
  {
    title: "Giant Steps",
    key: "B",
    progression: ["Bmaj7", "D7", "Gmaj7", "A#7", "D#maj7", "Amin7", "D7", "Gmaj7"]
  },
  {
    title: "ii-V-I in C",
    key: "C",
    progression: ["Dmin7", "G7", "Cmaj7", "Cmaj7"]
  }
];

// Utility Functions
const noteToMidi = (note) => {
  const noteMap = { 'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65, 'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71 };
  return noteMap[note];
};

const getChordNotes = (root, chordType) => {
  const rootMidi = noteToMidi(root);
  const intervals = CHORD_TYPES[chordType] || CHORD_TYPES['maj'];
  return intervals.map(interval => Tone.Frequency(rootMidi + interval, "midi").toNote());
};

const parseChord = (chordSymbol) => {
  const match = chordSymbol.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return { root: 'C', type: 'maj' };
  
  const [, root, type] = match;
  const chordType = type || 'maj';
  return { root, type: chordType };
};

// Components
const VirtualPiano = ({ highlightedNotes = [], onNoteClick }) => {
  const keys = [
    { note: 'C', type: 'white', offset: 0 },
    { note: 'C#', type: 'black', offset: 35 },
    { note: 'D', type: 'white', offset: 50 },
    { note: 'D#', type: 'black', offset: 85 },
    { note: 'E', type: 'white', offset: 100 },
    { note: 'F', type: 'white', offset: 150 },
    { note: 'F#', type: 'black', offset: 185 },
    { note: 'G', type: 'white', offset: 200 },
    { note: 'G#', type: 'black', offset: 235 },
    { note: 'A', type: 'white', offset: 250 },
    { note: 'A#', type: 'black', offset: 285 },
    { note: 'B', type: 'white', offset: 300 }
  ];

  const whiteKeys = keys.filter(key => key.type === 'white');
  const blackKeys = keys.filter(key => key.type === 'black');

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <div className="relative mx-auto" style={{ width: '350px', height: '140px' }}>
        {/* White Keys */}
        {whiteKeys.map((key) => (
          <button
            key={key.note}
            className={`absolute border border-gray-400 rounded-b-md transition-all duration-150 font-medium text-gray-700 ${
              highlightedNotes.includes(key.note) 
                ? 'bg-blue-300 border-blue-400 shadow-md' 
                : 'bg-white hover:bg-gray-50 shadow-sm'
            }`}
            style={{
              left: `${key.offset}px`,
              width: '48px',
              height: '120px',
              top: '0px'
            }}
            onClick={() => onNoteClick && onNoteClick(key.note)}
          >
            <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs">
              {key.note}
            </span>
          </button>
        ))}
        
        {/* Black Keys */}
        {blackKeys.map((key) => (
          <button
            key={key.note}
            className={`absolute rounded-b-md transition-all duration-150 font-medium text-white text-xs border border-gray-800 ${
              highlightedNotes.includes(key.note) 
                ? 'bg-blue-600 border-blue-700 shadow-lg' 
                : 'bg-gray-900 hover:bg-gray-700 shadow-md'
            }`}
            style={{
              left: `${key.offset}px`,
              width: '28px',
              height: '75px',
              top: '0px',
              zIndex: 10
            }}
            onClick={() => onNoteClick && onNoteClick(key.note)}
          >
            <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
              {key.note}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChordProgressionTrainer = ({ audioEngine }) => {
  const [currentProgression, setCurrentProgression] = useState(JAZZ_STANDARDS[0]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKey, setSelectedKey] = useState('C');
  const [showVoicing, setShowVoicing] = useState(false);
  
  const currentChord = currentProgression.progression[currentChordIndex];
  const { root, type } = parseChord(currentChord);
  const chordNotes = getChordNotes(root, type);

  const playChord = async () => {
    await audioEngine.start();
    audioEngine.playChord(chordNotes);
  };

  const nextChord = () => {
    setCurrentChordIndex((prev) => (prev + 1) % currentProgression.progression.length);
  };

  const prevChord = () => {
    setCurrentChordIndex((prev) => (prev - 1 + currentProgression.progression.length) % currentProgression.progression.length);
  };

  const transposeProgression = (newKey) => {
    const keyShift = NOTES.indexOf(newKey) - NOTES.indexOf(currentProgression.key);
    const transposed = currentProgression.progression.map(chord => {
      const { root, type } = parseChord(chord);
      const newRootIndex = (NOTES.indexOf(root) + keyShift + 12) % 12;
      return NOTES[newRootIndex] + type;
    });
    
    setCurrentProgression({
      ...currentProgression,
      key: newKey,
      progression: transposed
    });
    setSelectedKey(newKey);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Controls and Progression */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">{currentProgression.title}</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select 
                value={currentProgression.title} 
                onChange={(e) => setCurrentProgression(JAZZ_STANDARDS.find(s => s.title === e.target.value))}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {JAZZ_STANDARDS.map(standard => (
                  <option key={standard.title} value={standard.title}>{standard.title}</option>
                ))}
              </select>
              
              <select 
                value={selectedKey} 
                onChange={(e) => transposeProgression(e.target.value)} 
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {NOTES.map(note => (
                  <option key={note} value={note}>Key: {note}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowVoicing(!showVoicing)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {showVoicing ? 'Hide' : 'Show'} Voicing
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {currentProgression.progression.map((chord, index) => (
                <div
                  key={index}
                  className={`p-3 text-center rounded-lg cursor-pointer border-2 transition-all ${
                    index === currentChordIndex 
                      ? 'bg-blue-500 text-white border-blue-600 shadow-lg' 
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                  onClick={() => setCurrentChordIndex(index)}
                >
                  <div className="font-semibold">{chord}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button 
                onClick={prevChord} 
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={playChord} 
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
              >
                Play Chord
              </button>
              <button 
                onClick={nextChord} 
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Chord Information Panel */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Current Chord</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{currentChord}</div>
            {showVoicing && (
              <div className="space-y-2">
                <p className="text-gray-600">Chord Tones:</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {chordNotes.map((note, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-mono text-sm"
                    >
                      {note.replace(/\d/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Virtual Piano */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Virtual Piano</h3>
          {showVoicing ? (
            <VirtualPiano 
              highlightedNotes={chordNotes.map(note => note.replace(/\d/, ''))} 
              onNoteClick={(note) => audioEngine.start().then(() => audioEngine.playNote(note + '4'))}
            />
          ) : (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <div className="text-lg mb-2">🎹</div>
                <p>Click "Show Voicing" to see the virtual piano</p>
                <p className="text-sm">with highlighted chord notes</p>
              </div>
            </div>
          )}

          {/* Practice Tips - now inside the same white container */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <span className="text-blue-500 mr-2">💡</span>
              Practice Tips
            </h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Try playing the progression in different keys</li>
              <li>• Listen for the harmonic relationships between chords</li>
              <li>• Practice transitioning smoothly between chords</li>
              <li>• Pay attention to common tones and voice leading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const EarTrainingGame = ({ audioEngine }) => {
  const [gameMode, setGameMode] = useState('intervals');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const intervals = [
    { name: 'Perfect Unison', semitones: 0 },
    { name: 'Minor 2nd', semitones: 1 },
    { name: 'Major 2nd', semitones: 2 },
    { name: 'Minor 3rd', semitones: 3 },
    { name: 'Major 3rd', semitones: 4 },
    { name: 'Perfect 4th', semitones: 5 },
    { name: 'Tritone', semitones: 6 },
    { name: 'Perfect 5th', semitones: 7 },
    { name: 'Minor 6th', semitones: 8 },
    { name: 'Major 6th', semitones: 9 },
    { name: 'Minor 7th', semitones: 10 },
    { name: 'Major 7th', semitones: 11 },
    { name: 'Octave', semitones: 12 }
  ];

  const chordQualities = ['maj7', 'min7', '7', 'min7b5', 'dim7'];

  const generateIntervalQuestion = () => {
    const interval = intervals[Math.floor(Math.random() * intervals.length)];
    const rootNote = NOTES[Math.floor(Math.random() * NOTES.length)];
    const rootMidi = noteToMidi(rootNote);
    const topNote = Tone.Frequency(rootMidi + interval.semitones, "midi").toNote();
    
    return {
      type: 'interval',
      answer: interval.name,
      audio: [rootNote + '4', topNote],
      options: intervals.map(i => i.name)
    };
  };

  const generateChordQuestion = () => {
    const chordType = chordQualities[Math.floor(Math.random() * chordQualities.length)];
    const rootNote = NOTES[Math.floor(Math.random() * NOTES.length)];
    const notes = getChordNotes(rootNote, chordType);
    
    return {
      type: 'chord',
      answer: chordType,
      audio: notes,
      options: chordQualities
    };
  };

  const startNewQuestion = () => {
    const question = gameMode === 'intervals' ? generateIntervalQuestion() : generateChordQuestion();
    setCurrentQuestion(question);
    setShowAnswer(false);
  };

  const playQuestion = async () => {
    if (!currentQuestion) return;
    await audioEngine.start();
    
    if (currentQuestion.type === 'interval') {
      audioEngine.playNote(currentQuestion.audio[0]);
      setTimeout(() => audioEngine.playNote(currentQuestion.audio[1]), 500);
    } else {
      audioEngine.playChord(currentQuestion.audio);
    }
  };

  const handleAnswer = (selectedAnswer) => {
    setShowAnswer(true);
    setTotalQuestions(prev => prev + 1);
    if (selectedAnswer === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  useEffect(() => {
    startNewQuestion();
  }, [gameMode]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Ear Training</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setGameMode('intervals')}
          className={`px-4 py-2 rounded ${gameMode === 'intervals' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Intervals
        </button>
        <button
          onClick={() => setGameMode('chords')}
          className={`px-4 py-2 rounded ${gameMode === 'chords' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Chord Quality
        </button>
      </div>

      <div className="text-center mb-6">
        <p className="text-lg">Score: {score}/{totalQuestions}</p>
        <p className="text-gray-600">
          {totalQuestions > 0 ? `${Math.round((score/totalQuestions)*100)}%` : '0%'} accuracy
        </p>
      </div>

      {currentQuestion && (
        <div className="space-y-4">
          <div className="text-center">
            <button
              onClick={playQuestion}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-lg"
            >
              Play {currentQuestion.type === 'interval' ? 'Interval' : 'Chord'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={showAnswer}
                className={`p-3 rounded border-2 ${
                  showAnswer
                    ? option === currentQuestion.answer
                      ? 'bg-green-200 border-green-500'
                      : 'bg-gray-100 border-gray-300'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {showAnswer && (
            <div className="text-center space-y-2">
              <p className="text-lg">
                Answer: <strong>{currentQuestion.answer}</strong>
              </p>
              <button
                onClick={startNewQuestion}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VoiceLeadingTrainer = ({ audioEngine }) => {
  const songs = [
    {
      title: "ii-V-I in C",
      progression: ['Dmin7', 'G7', 'Cmaj7', 'Cmaj7'],
      voicings: [
        [57, 62, 65, 69], // Dmin7: A3, D4, F4, A4
        [59, 62, 65, 71], // G7: B3, D4, F4, B4  
        [60, 64, 67, 72], // Cmaj7: C4, E4, G4, C5
        [60, 64, 67, 72]  // Cmaj7: C4, E4, G4, C5
      ]
    },
    {
      title: "Circle of Fifths",
      progression: ['Cmaj7', 'Fmaj7', 'Bbmaj7', 'Ebmaj7'],
      voicings: [
        [60, 64, 67, 71], // Cmaj7: C4, E4, G4, B4
        [65, 69, 72, 76], // Fmaj7: F4, A4, C5, E5
        [62, 65, 70, 74], // Bbmaj7: D4, F4, Bb4, D5
        [63, 67, 70, 74]  // Ebmaj7: Eb4, G4, Bb4, D5
      ]
    },
    {
      title: "Autumn Leaves (excerpt)",
      progression: ['Amin7', 'D7', 'Gmaj7', 'Cmaj7'],
      voicings: [
        [57, 60, 64, 67], // Amin7: A3, C4, E4, G4
        [57, 61, 65, 69], // D7: A3, C#4, F#4, A4
        [59, 62, 66, 71], // Gmaj7: B3, D4, F#4, B4
        [60, 64, 67, 72]  // Cmaj7: C4, E4, G4, C5
      ]
    },
    {
      title: "Giant Steps (first 4)",
      progression: ['Bmaj7', 'D7', 'Gmaj7', 'Bb7'],
      voicings: [
        [59, 63, 66, 70], // Bmaj7: B3, D#4, F#4, A#4
        [57, 61, 65, 69], // D7: A3, C#4, F#4, A4
        [59, 62, 66, 71], // Gmaj7: B3, D4, F#4, B4
        [58, 62, 65, 69]  // Bb7: Bb3, D4, F4, A4
      ]
    }
  ];

  const [selectedSong, setSelectedSong] = useState(songs[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMovement, setShowMovement] = useState(true);
  const [showAllTransitions, setShowAllTransitions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const voiceColors = ['#ef4444', '#f97316', '#eab308', '#22c55e']; // red, orange, yellow, green
  const voiceNames = ['Bass', 'Tenor', 'Alto', 'Soprano'];

  const midiToNote = (midi) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  };

  const getMovementDistance = (from, to) => {
    return Math.abs(to - from);
  };

  const isCommonTone = (from, to) => {
    return from === to;
  };

  const playProgression = async () => {
    await audioEngine.start();
    setIsPlaying(true);
    
    for (let i = 0; i < selectedSong.progression.length; i++) {
      setTimeout(() => {
        const voicing = selectedSong.voicings[i];
        const notes = voicing.map(midi => midiToNote(midi));
        audioEngine.playChord(notes, '2n');
        setCurrentIndex(i);
        
        if (i === selectedSong.progression.length - 1) {
          setTimeout(() => setIsPlaying(false), 2000);
        }
      }, i * 2500);
    }
  };

  const playChord = async (index) => {
    await audioEngine.start();
    const voicing = selectedSong.voicings[index];
    const notes = voicing.map(midi => midiToNote(midi));
    audioEngine.playChord(notes, '1n');
    setCurrentIndex(index);
  };

  const VoiceMovementVisualizer = () => {
    if (!showMovement) return null;

    if (currentIndex === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
          <h4 className="font-semibold mb-3">Voice Movement Analysis</h4>
          <p className="text-gray-600">Select or play through chords to see voice leading analysis</p>
        </div>
      );
    }

    const prevVoicing = selectedSong.voicings[currentIndex - 1];
    const currentVoicing = selectedSong.voicings[currentIndex];

    return (
      <div className="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 className="font-semibold mb-3">Voice Movement Analysis - Current Transition</h4>
        <div className="space-y-2">
          {voiceNames.map((voiceName, voiceIndex) => {
            const from = prevVoicing[voiceIndex];
            const to = currentVoicing[voiceIndex];
            const distance = getMovementDistance(from, to);
            const direction = to > from ? '↑' : to < from ? '↓' : '→';
            const isCommon = isCommonTone(from, to);
            
            return (
              <div key={voiceIndex} className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: voiceColors[voiceIndex] }}
                />
                <span className="font-medium w-16">{voiceName}:</span>
                <span className="font-mono">
                  {midiToNote(from)} {direction} {midiToNote(to)}
                </span>
                <span className={`px-2 py-1 rounded text-sm ${
                  isCommon ? 'bg-green-100 text-green-800' : 
                  distance <= 2 ? 'bg-blue-100 text-blue-800' :
                  distance <= 4 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {isCommon ? 'Common Tone' : `${distance} semitones`}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 p-3 bg-white rounded border">
          <span className="font-medium">Total Movement: </span>
          <span className="font-mono">
            {prevVoicing.reduce((total, note, i) => 
              total + getMovementDistance(note, currentVoicing[i]), 0
            )} semitones
          </span>
        </div>
      </div>
    );
  };

  const AllTransitionsView = () => {
    if (!showMovement) return null;

    const transitions = [];
    for (let i = 1; i < selectedSong.voicings.length; i++) {
      const prevVoicing = selectedSong.voicings[i - 1];
      const currentVoicing = selectedSong.voicings[i];
      const fromChord = selectedSong.progression[i - 1];
      const toChord = selectedSong.progression[i];
      
      const voiceMovements = voiceNames.map((voiceName, voiceIndex) => {
        const from = prevVoicing[voiceIndex];
        const to = currentVoicing[voiceIndex];
        const distance = getMovementDistance(from, to);
        const direction = to > from ? '↑' : to < from ? '↓' : '→';
        const isCommon = isCommonTone(from, to);
        
        return {
          voiceName,
          voiceIndex,
          from,
          to,
          distance,
          direction,
          isCommon
        };
      });

      const totalMovement = prevVoicing.reduce((total, note, i) => 
        total + getMovementDistance(note, currentVoicing[i]), 0
      );

      transitions.push({
        fromChord,
        toChord,
        voiceMovements,
        totalMovement,
        transitionIndex: i - 1
      });
    }

    return (
      <div className="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 className="font-semibold mb-4">Complete Voice Leading Analysis</h4>
        
        {/* Overview Chart */}
        <div className="mb-6">
          <h5 className="font-medium mb-3">Voice Movement Overview</h5>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {selectedSong.progression.map((chord, index) => (
              <div key={index} className="text-center">
                <div className="font-bold text-lg mb-2">{chord}</div>
                <div className="space-y-1">
                  {selectedSong.voicings[index].slice().reverse().map((midi, voiceIndex) => {
                    const actualVoiceIndex = 3 - voiceIndex;
                    return (
                      <div key={actualVoiceIndex} className="flex items-center justify-center space-x-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: voiceColors[actualVoiceIndex] }}
                        />
                        <span className="font-mono text-xs">{midiToNote(midi)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Movement Flow Visualization */}
          <div className="voice-chart-container">
            <div className="relative h-64 w-full bg-white rounded border p-6 mb-4 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Reference grid lines */}
              {/* Horizontal pitch reference lines */}
              {[0, 15, 30, 45, 60, 75, 90].map(y => (
                <line
                  key={`h-${y}`}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.2"
                  strokeDasharray={y === 45 ? "none" : "1,1"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              
              {/* Vertical chord transition lines */}
              {selectedSong.voicings.map((_, chordIndex) => {
                if (chordIndex === 0 || chordIndex === selectedSong.voicings.length - 1) return null;
                const x = (chordIndex / (selectedSong.voicings.length - 1)) * 100;
                return (
                  <line
                    key={`v-${chordIndex}`}
                    x1={x}
                    x2={x}
                    y1="5"
                    y2="80"
                    stroke="#d1d5db"
                    strokeWidth="0.2"
                    strokeDasharray="1,1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              
              {/* Pitch labels */}
              {[
                { y: 0, label: 'High' },
                { y: 15, label: 'C5' },
                { y: 30, label: 'C4.5' },
                { y: 45, label: 'C4' },
                { y: 60, label: 'C3.5' },
                { y: 75, label: 'C3' },
                { y: 90, label: 'Low' }
              ].map(({ y, label }) => (
                <text
                  key={`label-${y}`}
                  x="1"
                  y={y + 1}
                  className="fill-gray-500"
                  fontSize="2.5"
                  fontFamily="system-ui"
                >
                  {label}
                </text>
              ))}
              
              {/* Chord labels at bottom */}
              {selectedSong.progression.map((chord, chordIndex) => {
                const x = (chordIndex / (selectedSong.voicings.length - 1)) * 100;
                return (
                  <text
                    key={`chord-${chordIndex}`}
                    x={x}
                    y="95"
                    textAnchor="middle"
                    className="fill-gray-700"
                    fontSize="3"
                    fontWeight="600"
                    fontFamily="system-ui"
                  >
                    {chord}
                  </text>
                );
              })}

              {/* Individual connecting lines between adjacent chords for each voice */}
              {selectedSong.voicings.slice(0, -1).map((voicing, chordIndex) => {
                const nextVoicing = selectedSong.voicings[chordIndex + 1];
                return [0, 1, 2, 3].map(voiceIndex => {
                  const x1 = (chordIndex / (selectedSong.voicings.length - 1)) * 100;
                  const x2 = ((chordIndex + 1) / (selectedSong.voicings.length - 1)) * 100;
                  const y1 = 80 - ((voicing[voiceIndex] - 48) / 32) * 70;
                  const y2 = 80 - ((nextVoicing[voiceIndex] - 48) / 32) * 70;
                  
                  const distance = Math.abs(nextVoicing[voiceIndex] - voicing[voiceIndex]);
                  const isCommon = distance === 0;
                  
                  return (
                    <line
                      key={`connect-${chordIndex}-${voiceIndex}`}
                      x1={x1}
                      x2={x2}
                      y1={y1}
                      y2={y2}
                      stroke={voiceColors[voiceIndex]}
                      strokeWidth={isCommon ? "1" : distance <= 2 ? "0.8" : "0.6"}
                      strokeDasharray={isCommon ? "none" : distance > 4 ? "2,1" : "none"}
                      opacity={isCommon ? "1" : distance <= 2 ? "0.9" : "0.7"}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                });
              })}
              
              {/* Chord markers - larger and more prominent */}
              {selectedSong.voicings.map((voicing, chordIndex) => (
                <g key={`markers-${chordIndex}`}>
                  {voicing.map((midi, voiceIndex) => {
                    const x = (chordIndex / (selectedSong.voicings.length - 1)) * 100;
                    const y = 80 - ((midi - 48) / 32) * 70;
                    return (
                      <circle
                        key={`marker-${chordIndex}-${voiceIndex}`}
                        cx={x}
                        cy={y}
                        r="1.2"
                        fill={voiceColors[voiceIndex]}
                        stroke="white"
                        strokeWidth="0.3"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </g>
              ))}
              
              {/* Voice name indicators on the right */}
              {voiceNames.map((name, index) => {
                const lastVoicing = selectedSong.voicings[selectedSong.voicings.length - 1];
                const midi = lastVoicing[index];
                const y = 80 - ((midi - 48) / 32) * 70;
                return (
                  <g key={`voice-label-${index}`}>
                    <text
                      x="96"
                      y={y + 1}
                      textAnchor="end"
                      className="font-semibold"
                      fill={voiceColors[index]}
                      fontSize="2.8"
                      fontFamily="system-ui"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
        </div>

        {/* Detailed Transitions */}
        <div className="space-y-4">
          {transitions.map((transition, index) => (
            <div key={index} className="bg-white p-4 rounded border">
              <h6 className="font-medium mb-3">
                Transition {index + 1}: {transition.fromChord} → {transition.toChord}
              </h6>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h6 className="text-sm font-medium mb-2">Voice Movements:</h6>
                  <div className="space-y-1">
                    {transition.voiceMovements.map((movement) => (
                      <div key={movement.voiceIndex} className="flex items-center space-x-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: voiceColors[movement.voiceIndex] }}
                        />
                        <span className="w-12">{movement.voiceName}:</span>
                        <span className="font-mono">
                          {midiToNote(movement.from)} {movement.direction} {midiToNote(movement.to)}
                        </span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          movement.isCommon ? 'bg-green-100 text-green-800' : 
                          movement.distance <= 2 ? 'bg-blue-100 text-blue-800' :
                          movement.distance <= 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {movement.isCommon ? 'CT' : `${movement.distance}st`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-gray-50 p-3 rounded w-full">
                    <span className="font-medium">Total Movement: </span>
                    <span className="font-mono text-lg">{transition.totalMovement} semitones</span>
                    <div className="text-xs text-gray-600 mt-1">
                      {transition.totalMovement <= 4 ? 'Excellent' :
                       transition.totalMovement <= 8 ? 'Good' :
                       transition.totalMovement <= 12 ? 'Fair' : 'Needs work'} voice leading
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h6 className="font-medium mb-2">Overall Analysis:</h6>
          <div className="text-sm space-y-1">
            <div>
              <span className="font-medium">Average movement per transition: </span>
              <span className="font-mono">
                {(transitions.reduce((sum, t) => sum + t.totalMovement, 0) / transitions.length).toFixed(1)} semitones
              </span>
            </div>
            <div>
              <span className="font-medium">Common tones: </span>
              <span>
                {transitions.reduce((sum, t) => 
                  sum + t.voiceMovements.filter(v => v.isCommon).length, 0
                )} out of {transitions.length * 4} total voice movements
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const VoicingDisplay = ({ voicing, chordSymbol, index, isActive }) => {
    return (
      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isActive 
          ? 'bg-blue-500 text-white border-blue-600 shadow-lg' 
          : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-md'
      }`}
      onClick={() => playChord(index)}>
        <div className="text-center">
          <div className="font-bold text-lg mb-2">{chordSymbol}</div>
          <div className="space-y-1">
            {voicing.slice().reverse().map((midi, voiceIndex) => {
              const actualVoiceIndex = 3 - voiceIndex; // Reverse for display (soprano on top)
              return (
                <div key={actualVoiceIndex} className="flex items-center justify-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: voiceColors[actualVoiceIndex] }}
                  />
                  <span className="font-mono text-sm">{midiToNote(midi)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg voice-leading-section">
      <h2 className="text-2xl font-bold mb-4">Voice Leading Trainer</h2>
      <p className="text-gray-600 mb-6">
        Watch how individual voices move smoothly between chord changes
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Song:</label>
        <select 
          value={selectedSong.title}
          onChange={(e) => {
            const song = songs.find(s => s.title === e.target.value);
            setSelectedSong(song);
            setCurrentIndex(0);
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {songs.map(song => (
            <option key={song.title} value={song.title}>{song.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {selectedSong.progression.map((chord, index) => (
          <VoicingDisplay
            key={index}
            voicing={selectedSong.voicings[index]}
            chordSymbol={chord}
            index={index}
            isActive={index === currentIndex}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <button
          onClick={playProgression}
          disabled={isPlaying}
          className={`px-6 py-2 rounded-lg font-medium ${
            isPlaying 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isPlaying ? 'Playing...' : 'Play Progression'}
        </button>
        
        <button
          onClick={() => setShowMovement(!showMovement)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {showMovement ? 'Hide' : 'Show'} Movement Analysis
        </button>

        {showMovement && (
          <button
            onClick={() => setShowAllTransitions(!showAllTransitions)}
            className={`px-4 py-2 rounded-lg font-medium ${
              showAllTransitions 
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {showAllTransitions ? 'Single Transition' : 'All Transitions'} View
          </button>
        )}
        
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
        >
          Previous
        </button>
        
        <button
          onClick={() => setCurrentIndex(Math.min(selectedSong.progression.length - 1, currentIndex + 1))}
          disabled={currentIndex === selectedSong.progression.length - 1}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
        >
          Next
        </button>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Voice Legend:</h4>
        <div className="flex flex-wrap gap-4">
          {voiceNames.map((name, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: voiceColors[index] }}
              />
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {showAllTransitions ? <AllTransitionsView /> : <VoiceMovementVisualizer />}
    </div>
  );
};

const StandardsLibrary = ({ audioEngine, onSelectStandard }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Jazz Standards Library</h2>
      
      <div className="space-y-4">
        {JAZZ_STANDARDS.map((standard, index) => (
          <div key={index} className="border p-4 rounded hover:bg-gray-50">
            <h3 className="font-bold text-lg">{standard.title}</h3>
            <p className="text-gray-600">Key: {standard.key}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {standard.progression.map((chord, i) => (
                <span key={i} className="px-2 py-1 bg-gray-200 rounded text-sm">
                  {chord}
                </span>
              ))}
            </div>
            <button
              onClick={() => onSelectStandard(standard)}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Practice This
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main App
const JazzPianoTrainer = () => {
  const [activeTab, setActiveTab] = useState('progression');
  const audioEngineRef = useRef(new AudioEngine());
  const [selectedStandard, setSelectedStandard] = useState(null);

  const tabs = [
    { id: 'progression', label: 'Chord Progressions', icon: '🎹' },
    { id: 'ear-training', label: 'Ear Training', icon: '👂' },
    { id: 'voice-leading', label: 'Voice Leading', icon: '🔗' },
    { id: 'standards', label: 'Standards Library', icon: '📚' }
  ];

  const handleSelectStandard = (standard) => {
    setSelectedStandard(standard);
    setActiveTab('progression');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 app-container">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎹 Jazz Piano Trainer
          </h1>
          <p className="text-gray-600 text-lg">
            Master jazz piano with interactive practice tools
          </p>
        </header>

        <nav className="mb-8">
          <div className="flex justify-center space-x-2 bg-white p-2 rounded-lg shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="max-w-4xl mx-auto">
          {activeTab === 'progression' && (
            <ChordProgressionTrainer audioEngine={audioEngineRef.current} />
          )}
          {activeTab === 'ear-training' && (
            <EarTrainingGame audioEngine={audioEngineRef.current} />
          )}
          {activeTab === 'voice-leading' && (
            <VoiceLeadingTrainer audioEngine={audioEngineRef.current} />
          )}
          {activeTab === 'standards' && (
            <StandardsLibrary 
              audioEngine={audioEngineRef.current} 
              onSelectStandard={handleSelectStandard}
            />
          )}
        </main>

        <footer className="mt-12 text-center text-gray-500">
          <p>Practice consistently. Your ears and fingers will thank you.</p>
        </footer>
      </div>
    </div>
  );
};

export default JazzPianoTrainer;