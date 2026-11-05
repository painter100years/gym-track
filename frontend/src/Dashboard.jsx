import { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard({ user, onNavigateToWorkouts }) {
    const [templates, setTemplates] = useState([]);
    const [currentWeight, setCurrentWeight] = useState(user?.weight || null);
    const [recentWorkouts, setRecentWorkouts] = useState([]);
    const [strengthPRs, setStrengthPRs] = useState([]);

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user?.id]);

    async function fetchDashboardData() {
        try {
            const templateRes = await fetch(`http://localhost:3000/api/workouts/${user.id}`);
            const templateJson = await templateRes.json();
            if (templateRes.ok) {
                setTemplates(templateJson.slice(0, 3));
            }

            const settingsRes = await fetch(`http://localhost:3000/api/settings/${user.id}`);
            const settingsJson = await settingsRes.json();
            if (settingsRes.ok && settingsJson.weight) {
                setCurrentWeight(settingsJson.weight);
            }

            const prRes = await fetch(`http://localhost:3000/api/progress/strength/${user.id}`);
            const prJson = await prRes.json();
            if (prRes.ok) {
                setStrengthPRs(prJson);
            }

            const historyRes = await fetch(`http://localhost:3000/api/workouts/history/${user.id}`);
            if (historyRes.ok) {
                const historyJson = await historyRes.json();
                setRecentWorkouts(historyJson.slice(0, 3));
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>Welcome back, {user?.first_name || 'Athlete'}!</h2>
                <p className="dashboard-subtitle">Ready to crush today's session?</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Current Weight</span>
                    <span className="stat-value">{currentWeight ? `${currentWeight} lbs` : 'Not set'}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Routines Ready</span>
                    <span className="stat-value">{templates.length}</span>
                </div>
            </div>

            {strengthPRs.length > 0 && (
                <div className="dashboard-section" style={{ marginBottom: '1.5rem' }}>
                    <h3>Personal Records</h3>
                    <div className="pr-grid">
                        {strengthPRs.map((pr, idx) => (
                            <div key={idx} className="pr-card">
                                <span className="pr-muscle">{pr.main_muscle}</span>
                                <span className="pr-weight">{pr.max_weight || 0} lbs</span>
                                <span className="pr-reps">{pr.max_reps || 0} Reps Max</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Quick Start Workout</h3>
                {templates.length === 0 ? (
                    <div className="empty-dashboard-card">
                        <p>No workout routines created yet.</p>
                        <button onClick={onNavigateToWorkouts} className="save-btn">
                            Create Your First Routine
                        </button>
                    </div>
                ) : (
                    <div className="quick-templates-grid">
                        {templates.map(t => (
                            <div key={t.workout_id} className="quick-template-card">
                                <div>
                                    <h4 className="template-title">{t.title}</h4>
                                    <span className="template-sub">Routine Template</span>
                                </div>
                                <button onClick={onNavigateToWorkouts} className="save-btn start-quick-btn">
                                    Start Workout
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {recentWorkouts.length > 0 && (
                <div className="dashboard-section">
                    <h3>Recent Activity</h3>
                    <div className="recent-workouts-list">
                        {recentWorkouts.map(w => (
                            <div key={w.workout_id} className="recent-workout-item">
                                <span className="recent-title">{w.title}</span>
                                <span className="recent-date">{new Date(w.workout_date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;