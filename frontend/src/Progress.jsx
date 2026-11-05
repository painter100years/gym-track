import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Progress.css';

function Progress({ user }) {
    const [weightLogs, setWeightLogs] = useState([]);
    const [strengthData, setStrengthData] = useState([]);
    const [newWeight, setNewWeight] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        async function fetchProgressData() {
            try {
                const weightRes = await fetch(`http://localhost:3000/api/progress/weight/${user.id}`);
                const weightJson = await weightRes.json();
                if (weightRes.ok) {
                    const formattedData = weightJson.map(log => ({
                        ...log,
                        dateStr: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }));
                    setWeightLogs(formattedData);
                }

                const strengthRes = await fetch(`http://localhost:3000/api/progress/strength/${user.id}`);
                const strengthJson = await strengthRes.json();
                if (strengthRes.ok) {
                    setStrengthData(strengthJson);
                }
            } catch (err) {
                console.error('Error fetching progress data:', err);
            }
        }

        if (user?.id) {
            fetchProgressData();
        }
    }, [user?.id]);

    async function handleAddWeight(e) {
        e.preventDefault();
        if (!newWeight || newWeight <= 0) {
            setStatusMsg('Please enter a valid weight');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/progress/weight/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: Number(newWeight) })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save weight');

            const newLog = {
                ...data,
                dateStr: new Date(data.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };

            const existingIndex = weightLogs.findIndex(log => log.dateStr === newLog.dateStr);
            if (existingIndex >= 0) {
                const updatedLogs = [...weightLogs];
                updatedLogs[existingIndex] = newLog;
                setWeightLogs(updatedLogs);
            } else {
                setWeightLogs([...weightLogs, newLog]);
            }

            setNewWeight('');
            setStatusMsg('Weight logged successfully!');
            setTimeout(() => setStatusMsg(''), 3000);
        } catch (err) {
            console.error(err);
            setStatusMsg(err.message || 'Error saving weight');
        }
    }

    function getStrengthRank(muscle, weight) {
        if (weight >= 225) return { tier: 'Elite', color: '#ff4500' };
        if (weight >= 185) return { tier: 'Advanced', color: '#ffa500' };
        if (weight >= 135) return { tier: 'Intermediate', color: '#ffd700' };
        return { tier: 'Novice', color: 'var(--text-secondary)' };
    }

    return (
        <div className="progress-container">
            <h2 className="progress-title">Progress Tracker</h2>

            <div className="progress-grid">
                <div className="progress-card chart-card">
                    
                    <h3>Weight History</h3>
                    {weightLogs.length === 0 ? (
                        <p className="no-data-text">No weight logs recorded yet. Start tracking below!</p>
                    ) : (
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={weightLogs} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hover)" />
                                    <XAxis dataKey="dateStr" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" domain={['dataMin - 5', 'dataMax + 5']} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--bg-card)', 
                                            borderColor: 'var(--accent-orange)', 
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px' 
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="weight" 
                                        stroke="var(--accent-orange)" 
                                        strokeWidth={3} 
                                        dot={{ fill: 'var(--accent-orange)' }} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="progress-card form-card">
                    <h3>Log New Weight</h3>
                    <form onSubmit={handleAddWeight} className="weight-form">
                        <div className="input-group">
                            <input 
                                type="number" 
                                step="0.1" 
                                placeholder="Enter weight" 
                                value={newWeight} 
                                onChange={(e) => setNewWeight(e.target.value)}
                            />
                            <button type="submit" className="save-btn">Log Weight</button>
                        </div>
                        {statusMsg && <p className="status-text">{statusMsg}</p>}
                    </form>
                </div>
            </div>

            <div className="progress-card strength-section">
                <h3>Muscle Group Strength & Ranks</h3>
                {strengthData.length === 0 ? (
                    <p className="no-data-text">No workout sets logged yet. Complete a workout to see your muscle ranks!</p>
                ) : (
                    <div className="muscle-grid">
                        {strengthData.map((item, idx) => {
                            const rank = getStrengthRank(item.main_muscle, item.max_weight);
                            return (
                                <div key={idx} className="muscle-card">
                                    <div className="muscle-info">
                                        <span className="muscle-name">{item.main_muscle.toUpperCase()}</span>
                                        <span className="max-lift">Peak: {item.max_weight} lbs ({item.max_reps} reps)</span>
                                    </div>
                                    <div className="muscle-rank" style={{ color: rank.color }}>
                                        {rank.tier}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Progress;