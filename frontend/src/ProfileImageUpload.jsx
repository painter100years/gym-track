import { useState, useRef } from 'react';
import './Settings.css';

function ProfileImageUpload({ previewUrl, setPreviewUrl, setSelectedFile }) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
  }

  return (
    <div className="avatar-settings">
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }}
        onChange={handleFileChange} 
      />

      <button 
        type="button" 
        className="change-photo-btn"
        onClick={() => fileInputRef.current.click()}
      >
        Change Photo
      </button>
    </div>
  );
}

export default ProfileImageUpload;