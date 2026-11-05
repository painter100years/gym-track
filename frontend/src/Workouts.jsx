import { useState, useEffect, useRef } from 'react';
import './Workouts.css';

function Workouts({ user }) {
    const [workouts, setWorkouts] = useState([]);
    const [exercises, setExercises] = useState([]);
    
    const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
    const [editingWorkoutId, setEditingWorkoutId] = useState(null);
    const [isActiveWorkout, setIsActiveWorkout] = useState(false);
    
    const [workoutTitle, setWorkoutTitle] = useState('');
    const [workoutExercises, setWorkoutExercises] = useState([]);
    
    const [activeWorkoutTitle, setActiveWorkoutTitle] = useState('');
    const [liveWorkoutData, setLiveWorkoutData] = useState([]);
    
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [selectedExerciseName, setSelectedExerciseName] = useState('Select Exercise');
    const [setCount, setSetCount] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchWorkoutsAndExercises();

        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [user?.id]);

    async function fetchWorkoutsAndExercises() {
        try {
            if (user?.id) {
                const workoutRes = await fetch(`http://localhost:3000/api/workouts/${user.id}`);
                const workoutJson = await workoutRes.json();
                if (workoutRes.ok) setWorkouts(workoutJson);
            }

            const exRes = await fetch('http://localhost:3000/api/exercises');
            const exJson = await exRes.json();
            if (exRes.ok) setExercises(exJson);
        } catch (err) {
            console.error(err);
        }
    }

    function handleOpenCreateForm() {
        setIsCreatingWorkout(true);
        setEditingWorkoutId(null);
        setIsActiveWorkout(false);
        setWorkoutTitle('');
        setWorkoutExercises([]);
        setStatusMsg('');
    }

    async function handleOpenEditForm(workout) {
        setIsCreatingWorkout(true);
        setEditingWorkoutId(workout.workout_id);
        setIsActiveWorkout(false);
        setWorkoutTitle(workout.title);
        setStatusMsg('');

        try {
            const res = await fetch(`http://localhost:3000/api/workouts/sets/${workout.workout_id}`);
            const data = await res.json();
            if (res.ok) {
                const formattedExercises = data.map((item, idx) => ({
                    exercise_id: item.exercise_id,
                    exercise_name: item.exercise_name || item.name || 'Unknown Exercise',
                    main_muscle: item.main_muscle || '',
                    set_count: item.set_count,
                    exercise_order: idx + 1
                }));
                setWorkoutExercises(formattedExercises);
            }
        } catch (err) {
            console.error(err);
            setStatusMsg('Failed to load routine exercises.');
        }
    }

    async function handleStartWorkout(workout, e) {
        e.stopPropagation();
        setActiveWorkoutTitle(workout.title);
        setStatusMsg('');

        try {
            const res = await fetch(`http://localhost:3000/api/workouts/sets/${workout.workout_id}`);
            const data = await res.json();
            if (res.ok) {
                const initializedExercises = data.map((item, exIdx) => {
                    const totalSets = item.set_count || 1;
                    const setsArray = [];
                    for (let i = 1; i <= totalSets; i++) {
                        setsArray.push({
                            set_number: i,
                            weight: '',
                            reps: ''
                        });
                    }
                    return {
                        exercise_id: item.exercise_id,
                        exercise_name: item.exercise_name || 'Unknown Exercise',
                        main_muscle: item.main_muscle || '',
                        sets: setsArray
                    };
                });

                setLiveWorkoutData(initializedExercises);
                setIsActiveWorkout(true);
                setIsCreatingWorkout(false);
            }
        } catch (err) {
            console.error(err);
            setStatusMsg('Failed to start workout session.');
        }
    }

    function handleCancelForm() {
        setIsCreatingWorkout(false);
        setIsActiveWorkout(false);
        setEditingWorkoutId(null);
        setWorkoutTitle('');
        setWorkoutExercises([]);
        setLiveWorkoutData([]);
        setStatusMsg('');
    }

    function handleSetInputChange(exIndex, setIndex, field, value) {
        const updated = [...liveWorkoutData];
        updated[exIndex].sets[setIndex][field] = value;
        setLiveWorkoutData(updated);
    }

    async function handleFinishLiveWorkout(e) {
        e.preventDefault();
        try {
            const workoutRes = await fetch(`http://localhost:3000/api/workouts/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: `${activeWorkoutTitle} (Completed)`,
                    is_template: false 
                })
            });
            const workoutData = await workoutRes.json();
            if (!workoutRes.ok) throw new Error(workoutData.error);

            const newWorkoutId = workoutData.workout_id;

            const flattenedSets = [];
            let globalSetOrder = 1;

            liveWorkoutData.forEach(ex => {
                ex.sets.forEach(s => {
                    flattenedSets.push({
                        exercise_id: ex.exercise_id,
                        weight: Number(s.weight) || 0,
                        reps: Number(s.reps) || 0,
                        set_order: globalSetOrder++
                    });
                });
            });

            const setsRes = await fetch(`http://localhost:3000/api/workouts/live-sets/${newWorkoutId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sets: flattenedSets })
            });
            const setsData = await setsRes.json();
            if (!setsRes.ok) throw new Error(setsData.error);

            handleCancelForm();
            fetchWorkoutsAndExercises();
        } catch (err) {
            console.error(err);
            setStatusMsg('Failed to save completed workout stats.');
        }
    }

    function handleAddExerciseToTemplate(e) {
        e.preventDefault();
        if (!selectedExerciseId) {
            setStatusMsg('Please select an exercise.');
            return;
        }

        const selectedEx = exercises.find(ex => ex.exercise_id === Number(selectedExerciseId));

        const newItem = {
            exercise_id: Number(selectedExerciseId),
            exercise_name: selectedEx ? selectedEx.name : 'Unknown Exercise',
            main_muscle: selectedEx ? selectedEx.main_muscle : '',
            set_count: Number(setCount) || 0,
            exercise_order: workoutExercises.length + 1
        };

        setWorkoutExercises([...workoutExercises, newItem]);
        setSelectedExerciseId('');
        setSelectedExerciseName('Select Exercise');
        setSetCount('');
        setStatusMsg('');
    }

    function handleRemoveExercise(indexToRemove) {
        const updatedExercises = workoutExercises
            .filter((_, idx) => idx !== indexToRemove)
            .map((item, idx) => ({ ...item, exercise_order: idx + 1 }));
        
        setWorkoutExercises(updatedExercises);
    }

    async function handleSaveWorkout(e) {
        e.preventDefault();
        if (!workoutTitle.trim()) {
            setStatusMsg('Please provide a workout routine title.');
            return;
        }
        if (workoutExercises.length === 0) {
            setStatusMsg('Please add at least one exercise to your workout.');
            return;
        }

        try {
            let targetWorkoutId = editingWorkoutId;

            if (editingWorkoutId) {
                await fetch(`http://localhost:3000/api/workouts/${editingWorkoutId}`, {
                    method: 'DELETE'
                });
            }

            const workoutRes = await fetch(`http://localhost:3000/api/workouts/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: workoutTitle })
            });
            const workoutData = await workoutRes.json();
            if (!workoutRes.ok) throw new Error(workoutData.error);

            targetWorkoutId = workoutData.workout_id;

            const setsRes = await fetch(`http://localhost:3000/api/workouts/sets/${targetWorkoutId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sets: workoutExercises })
            });
            const setsData = await setsRes.json();
            if (!setsRes.ok) throw new Error(setsData.error);

            handleCancelForm();
            fetchWorkoutsAndExercises();
        } catch (err) {
            console.error(err);
            setStatusMsg('Failed to save workout routine.');
        }
    }

    async function handleDeleteWorkoutRoutine(workoutId) {
        if (!window.confirm("Are you sure you want to delete this workout routine?")) return;

        try {
            const res = await fetch(`http://localhost:3000/api/workouts/${workoutId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                handleCancelForm();
                fetchWorkoutsAndExercises();
            } else {
                setStatusMsg('Failed to delete workout.');
            }
        } catch (err) {
            console.error(err);
            setStatusMsg('Failed to delete workout.');
        }
    }

    const groupedExercises = exercises.reduce((acc, ex) => {
        const muscle = ex.main_muscle || 'Other';
        if (!acc[muscle]) acc[muscle] = [];
        acc[muscle].push(ex);
        return acc;
    }, {});

    return (
        <div className="workouts-container">
            <h2 className="workouts-title">Workouts</h2>

            {!isCreatingWorkout && !isActiveWorkout ? (
                <div className="workouts-card">
                    <button onClick={handleOpenCreateForm} className="save-btn">Create Workout</button>
                    
                    {workouts.length === 0 ? (
                        <p className="no-data-text workout-empty-msg">No workout routines created yet. Click above to add one!</p>
                    ) : (
                        <div className="workouts-list">
                            {workouts.map(w => (
                                <div 
                                    key={w.workout_id} 
                                    className="muscle-card workout-item-card clickable-workout-card"
                                    onClick={() => handleOpenEditForm(w)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <div>
                                        <span className="muscle-name" style={{ display: 'block' }}>{w.title}</span>
                                        <span className="max-lift">Routine Template (Click to Edit)</span>
                                    </div>
                                    <button 
                                        onClick={(e) => handleStartWorkout(w, e)} 
                                        className="save-btn"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                    >
                                        Start Workout
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : isActiveWorkout ? (
                /* ACTIVE WORKOUT LOGGING VIEW */
                <div className="workouts-card">
                    <h3>🟢 Live Session: {activeWorkoutTitle}</h3>
                    <form onSubmit={handleFinishLiveWorkout} className="workout-form">
                        {liveWorkoutData.map((ex, exIdx) => (
                            <div key={ex.exercise_id} className="workout-builder-section" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                                <h4>{ex.exercise_name} <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>({ex.main_muscle})</span></h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {ex.sets.map((setObj, setIdx) => (
                                        <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ minWidth: '50px', fontWeight: 'bold' }}>Set {setObj.set_number}</span>
                                            <input 
                                                type="number" 
                                                placeholder="Weight (lbs/kg)" 
                                                value={setObj.weight}
                                                onChange={(e) => handleSetInputChange(exIdx, setIdx, 'weight', e.target.value)}
                                                style={{ flex: 1, padding: '0.5rem' }}
                                                min="0"
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Reps" 
                                                value={setObj.reps}
                                                onChange={(e) => handleSetInputChange(exIdx, setIdx, 'reps', e.target.value)}
                                                style={{ flex: 1, padding: '0.5rem' }}
                                                min="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {statusMsg && <p className="status-text">{statusMsg}</p>}

                        <div className="form-actions-row">
                            <button type="submit" className="save-btn" style={{ backgroundColor: '#28a745' }}>Finish Workout</button>
                            <button type="button" onClick={handleCancelForm} className="finish-btn cancel-full-btn">Cancel</button>
                        </div>
                    </form>
                </div>
            ) : (
                /* TEMPLATE BUILDER / EDIT VIEW */
                <div className="workouts-card">
                    <h3>{editingWorkoutId ? 'Edit Workout Template' : 'New Workout Template'}</h3>
                    <form onSubmit={handleSaveWorkout} className="workout-form">
                        <input 
                            type="text" 
                            placeholder="Routine Title (e.g., Chest & Triceps)" 
                            value={workoutTitle}
                            onChange={(e) => setWorkoutTitle(e.target.value)}
                        />

                        <div className="workout-builder-section">
                            <h4>Add Exercise and Sets</h4>
                            
                            <div className="custom-dropdown-container" ref={dropdownRef}>
                                <div 
                                    className="custom-dropdown-selected" 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <span>{selectedExerciseName}</span>
                                    <span className="dropdown-arrow">▼</span>
                                </div>

                                {isDropdownOpen && (
                                    <div className="custom-dropdown-list">
                                        {Object.entries(groupedExercises).map(([muscle, group]) => (
                                            <div key={muscle} className="dropdown-group">
                                                <div className="dropdown-group-title">{muscle.toUpperCase()}</div>
                                                {group.map(ex => (
                                                    <div 
                                                        key={ex.exercise_id} 
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            setSelectedExerciseId(ex.exercise_id);
                                                            setSelectedExerciseName(ex.name);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        {ex.name}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="set-inputs">
                                <input 
                                    type="number" 
                                    placeholder="Number of Sets" 
                                    value={setCount}
                                    onChange={(e) => setSetCount(e.target.value)}
                                    min="1"
                                />
                                <button type="button" onClick={handleAddExerciseToTemplate} className="save-btn add-set-btn">
                                    Add Exercise
                                </button>
                            </div>
                        </div>

                        {workoutExercises.length > 0 && (
                            <div className="logged-sets-list">
                                <h4>Routine Exercises ({workoutExercises.length})</h4>
                                <ul className="draft-sets-ul">
                                    {workoutExercises.map((item, idx) => (
                                        <li key={idx} className="draft-set-li draft-set-item-row">
                                            <span>{idx + 1}. <strong>{item.exercise_name}</strong> ({item.main_muscle}) - <strong>{item.set_count}</strong> Sets</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveExercise(idx)} 
                                                className="remove-exercise-btn"
                                                title="Delete Exercise"
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {statusMsg && <p className="status-text">{statusMsg}</p>}

                        <div className="form-actions-row">
                            <button type="submit" className="save-btn">Save Routine</button>
                            {editingWorkoutId && (
                                <button 
                                    type="button" 
                                    onClick={() => handleDeleteWorkoutRoutine(editingWorkoutId)} 
                                    className="save-btn delete-routine-btn"
                                    style={{ backgroundColor: '#ff4d4d' }}
                                >
                                    Delete Routine
                                </button>
                            )}
                            <button type="button" onClick={handleCancelForm} className="finish-btn cancel-full-btn">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Workouts;