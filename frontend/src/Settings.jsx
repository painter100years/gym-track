import { useState, useEffect } from "react";
import ProfileImageUpload from "./ProfileImageUpload";
import './Settings.css';

function Settings ({ user, onUpdateUser }) {
    const [pfpUrl, setPfpUrl] = useState('/favicon.svg');
    const [darkMode, setDarkMode] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [statusMsg, setStatusMsg] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [age, setAge] = useState(0);
    const [weight, setWeight] = useState(0);
    const [height, setHeight] = useState(0);

    const [errorMessage, setErrorMessage] = useState('');


    const checkImageValid = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
        });
    };

    
    useEffect(() => {
        async function loadSettings() {
            try {
                const res = await fetch(`http://localhost:3000/api/settings/${user.id}`);
                const data = await res.json();
                if (data.profile_image_url) setPfpUrl(data.profile_image_url);
                if (data.dark_mode !== undefined) setDarkMode(data.dark_mode);
                if (data.first_name) setFirstName(data.first_name);
                if (data.last_name) setLastName(data.last_name);
                if (data.age) setAge(data.age);
                if (data.weight) setWeight(data.weight);
                if (data) setHeight(data.height);
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        }
        if (user?.id) {
            loadSettings();
        }
    }, [user?.id]);

    async function handleSaveSettings(e) {
        e.preventDefault();

        if (pfpUrl === '') {
            setErrorMessage('Invalid Profile Picture');
            return;
        }

        if (!selectedFile) {
            const isValidImage = await checkImageValid(pfpUrl);
            if (!isValidImage) {
                setErrorMessage('Invalid Profile Picture');
                return;
            }
        }

        if (firstName === '') {
            setErrorMessage('Invalid First Name');
            return;
        }
        if (lastName === '') {
            setErrorMessage('Invalid Last Name');
            return;
        }
        if (!age || age <= 0) {
            setErrorMessage('Invalid Age');
            return;
        }
        if (!weight || weight <= 0) {
            setErrorMessage('Invalid Weight');
            return;
        }
        if (!height || height <= 0) {
            setErrorMessage('Invalid Height');
            return;
        }

        setErrorMessage('');

        setStatusMsg('Saving...');

        try {
            let finalImageUrl = pfpUrl;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('avatar', selectedFile);

                const uploadRes = await fetch(`http://localhost:3000/api/upload-avatar/${user.id}`, {
                    method: 'POST',
                    body: formData
                });

                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload image');

                finalImageUrl = uploadData.profile_image_url;
                setPfpUrl(finalImageUrl);
            }

            const res = await fetch(`http://localhost:3000/api/settings/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_image_url: finalImageUrl,
                    dark_mode: darkMode,
                    first_name: firstName,
                    last_name: lastName,
                    age: Number(age),
                    weight: Number(weight),
                    height: Number(height)
                })
            });

            if (!res.ok) throw new Error('Failed to save settings');

            const savedSettings = await res.json();

            setStatusMsg('Settings saved successfully!');
            onUpdateUser({ 
                ...user, 
                first_name: savedSettings.first_name,
                last_name: savedSettings.last_name,
                profile_image_url: savedSettings.profile_image_url, 
                dark_mode: savedSettings.dark_mode 
            });
            
            setSelectedFile(null);

        } catch (err) {
            console.error(err);
            setStatusMsg(err.message || 'Error updating settings');
        }
    }

    return (
        <div className="settings-container">
            <h2 className="settings-title">Profile Settings</h2>
            
            <form onSubmit={handleSaveSettings} id='settings-form'>
                <div className="pfp-section">
                    <div className="pfp-review">
                        <h2>Profile Picture</h2>
                        <div className="avatar-preview">
                            <img className="pfp" src={pfpUrl || '/favicon.svg'} alt="Avatar preview" onError={(e) => { e.currentTarget.src = '/favicon.svg'; }}/>
                        </div>
                    </div>

                    <div className="image-details">
                        <ProfileImageUpload
                            user={user} 
                            previewUrl={pfpUrl}
                            setPreviewUrl={setPfpUrl}
                            setSelectedFile={setSelectedFile} 
                        />
                        <label>Profile Image URL:</label>
                        <input
                            type="text"
                            value={pfpUrl}
                            onChange={(e) => setPfpUrl(e.target.value)}
                            className="pfp-url-input"
                        />
                    </div>
                </div>

                <div className="preferences-section">
                    <div className="dark-mode-label">
                        <h2>Preferences</h2>
                        <label className="theme-switch">{darkMode ? 'Dark Mode' : 'Light Mode'}
                            <input 
                                type="checkbox" 
                                checked={darkMode} 
                                onChange={(e) => setDarkMode(e.target.checked)} 
                            />
                            <span className="slider"></span>
                        </label>
                        
                    </div>
                    <div className="user-info-sec">
                        <h3>First Name</h3>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
                        <h3>Last Name</h3>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
                        <h3>Age</h3>
                        <input type="number" value={age} onChange={(e) => setAge(e.target.value)}/>
                        <h3>Weight</h3>
                        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}/>
                        <h3>Height</h3>
                        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}/>
                        <label className="error-label">{errorMessage}</label>
                    </div>
                </div>

                <button type="submit" className="save-btn">Save Changes</button>
            </form>

            {statusMsg && <p className="status-text">{statusMsg}</p>}
        </div>
    );
}

export default Settings;