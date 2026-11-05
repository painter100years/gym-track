import { useState, useEffect } from 'react'
import './Home.css'
import Settings from './Settings'
import Progress from './Progress'
import Workouts from './Workouts'
import Dashboard from './Dashboard'

function Home({ user, onLogout, onUpdateUser }) {

    const [activeTab, setActiveTab] = useState('Dashboard');
    const [pfpImage, setPfpImage] = useState('./public/favicon.svg');
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        async function fetchUserSettings() {
            try {
                const res = await fetch(`http://localhost:3000/api/settings/${user.id}`);
                const data = await res.json();

                if (user?.profile_image_url) {
                    setPfpImage(user.profile_image_url);
                }
                if (user?.dark_mode !== undefined) {
                    setDarkMode(user.dark_mode);
                }

            } catch (err) {
                console.error('Error fetching initial settings:', err);
            }
        }

        if (user?.id) {
            fetchUserSettings();
        }
    }, [user?.profile_image_url, user?.dark_mode]);
    
    return (
        <div className={`home-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
            <div className='nav-bar'>
                <nav>
                    <h2 className='web-name'><span>Gym</span>Track</h2>
                    <div className='nav-profile-container'>
                        <h3 className='profile-name'>{user.first_name} {user.last_name}</h3>
                        <img className='pfp' src={pfpImage} alt="Profile" />
                    </div>
                </nav>
            </div>
            <div className='main-body'>
                <aside className='side-bar'>
                    <div className='side-btns'>
                        {['Dashboard', 'Workouts', 'Progress', 'Settings'].map((tab) => (
                            <a 
                                key={tab}
                                className={activeTab === tab ? 'active' : ''}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </a>
                        ))}
                    </div>
                    <button className='logout-btn' onClick={onLogout}>Logout</button>
                </aside>
                <div className='content-display'>
                    {activeTab === 'Dashboard' && (
                        <Dashboard 
                            user={user} 
                            onNavigateToWorkouts={() => setActiveTab('Workouts')} 
                        />
                    )}

                    {activeTab === 'Settings' && (
                        <Settings user={user} onUpdateUser={onUpdateUser} />
                    )}
                    {activeTab === 'Progress' && (
                        <Progress user={user} />
                    )}
                    {activeTab === 'Workouts' && (
                        <Workouts user={user} />
                    )}
                </div>
            </div>
        </div>
    )
}

export default Home;