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
    key: "Ab", 
    progression: ["Fmin7", "Bbmin7", "Eb7", "Abmaj7", "Dbmaj7", "Dmin7b5", "G7", "Cmaj7"]
  },
  {
    title: "Giant Steps",
    key: "B",
    progression: ["Bmaj7", "D7", "Gmaj7", "Bb7", "Ebmaj7", "Amin7", "D7", "Gmaj7"]
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
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackKeys = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''];

  return (
    <div className="relative bg-gray-800 p-4 rounded-lg">
      <div className="flex relative">
        {whiteKeys.map((note, index) => (
          <button
            key={note}
            className={`w-12 h-32 border border-gray-300 bg-white hover:bg-gray-100 ${
              highlightedNotes.includes(note) ? 'bg-blue-200' : ''
            }`}
            onClick={() => onNoteClick && onNoteClick(note)}
          >
            <span className="text-xs mt-24 block">{note}</span>
          </button>
        ))}
        <div className="absolute flex">
          {blackKeys.map((note, index) => (
            note ? (
              <button
                key={note}
                className={`w-8 h-20 bg-gray-900 hover:bg-gray-700 ml-8 ${
                  highlightedNotes.includes(note) ? 'bg-blue-600' : ''
                }`}
                style={{ marginLeft: index === 0 ? '2rem' : '2.5rem' }}
                onClick={() => onNoteClick && onNoteClick(note)}
              >
                <span className="text-white text-xs mt-16 block">{note}</span>
              </button>
            ) : (
              <div key={index} className="w-8 ml-8" style={{ marginLeft: index === 0 ? '2rem' : '2.5rem' }} />
            )
          ))}
        </div>
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">{currentProgression.title}</h2>
        
        <div className="flex gap-4 mb-4">
          <select 
            value={currentProgression.title} 
            onChange={(e) => setCurrentProgression(JAZZ_STANDARDS.find(s => s.title === e.target.value))}
            className="px-3 py-2 border rounded"
          >
            {JAZZ_STANDARDS.map(standard => (
              <option key={standard.title} value={standard.title}>{standard.title}</option>
            ))}
          </select>
          
          <select value={selectedKey} onChange={(e) => transposeProgression(e.target.value)} className="px-3 py-2 border rounded">
            {NOTES.map(note => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowVoicing(!showVoicing)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showVoicing ? 'Hide' : 'Show'} Voicing
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {currentProgression.progression.map((chord, index) => (
            <div
              key={index}
              className={`p-3 text-center rounded cursor-pointer border-2 ${
                index === currentChordIndex 
                  ? 'bg-blue-500 text-white border-blue-600' 
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentChordIndex(index)}
            >
              {chord}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={prevChord} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Previous
          </button>
          <button onClick={playChord} className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Play Chord
          </button>
          <button onClick={nextChord} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Next
          </button>
        </div>

        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold">{currentChord}</h3>
          {showVoicing && (
            <p className="text-gray-600 mt-2">Notes: {chordNotes.join(', ')}</p>
          )}
        </div>
      </div>

      {showVoicing && (
        <VirtualPiano 
          highlightedNotes={chordNotes.map(note => note.replace(/\d/, ''))} 
          onNoteClick={(note) => audioEngine.start().then(() => audioEngine.playNote(note + '4'))}
        />
      )}
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
    if (!showMovement || currentIndex === 0) return null;

    const prevVoicing = selectedSong.voicings[currentIndex - 1];
    const currentVoicing = selectedSong.voicings[currentIndex];

    return (
      <div className="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 className="font-semibold mb-3">Voice Movement Analysis</h4>
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
    <div className="bg-white p-6 rounded-lg shadow-lg">
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

      <VoiceMovementVisualizer />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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