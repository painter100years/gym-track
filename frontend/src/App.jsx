import { useState } from 'react'
import Home from './Home';
import './App.css'

function App() {
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gymtrack_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activeForm, setActiveForm] = useState('login');
  
  const [emailError, setEmailError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regWeight, setRegWeight] = useState('');
  const [regHeight, setRegHeight] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [logEmail, setLogEmail] = useState('');
  const [logPassword, setLogPassword] = useState('');

  async function handleCreateAccount(e) {
    e.preventDefault();

    const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    setEmailError('');
    setFirstNameError('');
    setLastNameError('');
    setAgeError('');
    setWeightError('');
    setHeightError('');
    setPasswordError('');

    if (!emailFormat.test(regEmail)) {
      setEmailError('Please include a valid email address');
      return;
    }

    if (!regFirstName) {
      setFirstNameError('First name field cannot be empty');
      return;
    }

    if (!regLastName) {
      setLastNameError('Last name field cannot be empty');
      return;
    }

    if (!regAge) {
      setAgeError('Must enter a valid age');
      return;
    } else if(regAge <= 0) {
      setAgeError('Age must be greater than 0');
      return;
    } else if(regAge >= 120) {
      setAgeError('Age must be less than 120');
      return;
    }

    if (!regWeight) {
      setWeightError('Must enter a valid weight');
      return;
    } else if(regWeight <= 0) {
      setWeightError('Weight must be greater than 0');
      return;
    }

    if (!regHeight) {
      setHeightError('Must enter a valid height');
      return;
    } else if(regHeight <= 0) {
      setHeightError('Height must be greater than 0');
      return;
    }

    if (regPassword.length < 8) {
      setPasswordError('Password must be 8 characters');
      return
    }
    
    setFirstNameError('');
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: regEmail,
        first_name: regFirstName,
        last_name: regLastName,
        age: Number(regAge),
        weight: Number(regWeight),
        height: Number(regHeight),
        user_password: regPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setPasswordError(data.error);
      return;
    }

    localStorage.setItem('gymtrack_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setPasswordError('');
    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: logEmail,
          user_password: logPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error);
        return;
      }

      localStorage.setItem('gymtrack_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (err) {
      setPasswordError('Server error. Please try again.');
    }

  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('gymtrack_user');
  }

  function handleUpdateUser(updatedUserData) {
    setUser(updatedUserData);
    localStorage.setItem('gymtrack_user', JSON.stringify(updatedUserData));
  }

  if (user) {
    return <Home user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
  }

  return (
    <>
      <div className='form-tab'>
          <form className={`register-form${activeForm === 'login' ? '' : '-active'}`} onSubmit={handleCreateAccount}>
            <label className='form-title'>Register</label>
            <input placeholder='Email' onChange={(e) => setRegEmail(e.target.value)}/>
            {emailError && <p className="error">{emailError}</p>}
            <input placeholder='First Name' onChange={(e) => setRegFirstName(e.target.value)}/>
            {firstNameError && <p className="error">{firstNameError}</p>}
            <input placeholder='Last Name' onChange={(e) => setRegLastName(e.target.value)}/>
            {lastNameError && <p className="error">{lastNameError}</p>}
            <div className='numerical-values'>
              <input placeholder='Age' type='number' onChange={(e) => setRegAge(e.target.value)}/>
              <input placeholder='Weight (lbs)' type='number' onChange={(e) => setRegWeight(e.target.value)}/>
              <input placeholder='Height (cm)' type='number' onChange={(e) => setRegHeight(e.target.value)}/>
            </div>
            {ageError && <p className="error">{ageError}</p>}
            {weightError && <p className="error">{weightError}</p>}
            {heightError && <p className="error">{heightError}</p>}
            <input placeholder='Password' type='password' onChange={(e) => setRegPassword(e.target.value)}/>
            {passwordError && <p className="error">{passwordError}</p>}
            <button className='register-btn' type='submit'>Create Account</button>
            <a className='form-link' onClick={() => setActiveForm('login')}>Login</a>
          </form>
          <form className={`login-form${activeForm === 'register' ? '' : '-active'}`} onSubmit={handleLogin}>
            <label className='form-title'>Login</label>
            <input type='email' placeholder='Email' onChange={(e) => setLogEmail(e.target.value)} required/>
            <input placeholder='Password' type='password' onChange={(e) => setLogPassword(e.target.value)}/>
            {passwordError && <p className="error">{passwordError}</p>}
            <button className='login-btn' type='submit'>Login</button>
            <a className='form-link' onClick={() => setActiveForm('register')}>Create Account</a>
          </form>
      </div>
    </>
  )
}

export default App
