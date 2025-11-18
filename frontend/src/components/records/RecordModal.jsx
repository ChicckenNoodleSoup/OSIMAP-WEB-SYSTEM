import React from 'react';

const RecordModal = ({ 
  showModal, 
  modalMode, 
  formData, 
  setFormData, 
  handleSubmit, 
  closeModal 
}) => {
  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {modalMode === 'create' ? 'Add New Record' : 'Edit Record'}
        </h2>
        
        <form onSubmit={handleSubmit} className="record-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Barangay *</label>
              <input
                type="text"
                value={formData.barangay}
                onChange={(e) => setFormData({...formData, barangay: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Date Committed *</label>
              <input
                type="date"
                value={formData.datecommitted}
                onChange={(e) => setFormData({...formData, datecommitted: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Time Committed</label>
              <input
                type="time"
                value={formData.timecommitted}
                onChange={(e) => setFormData({...formData, timecommitted: e.target.value})}
              />
            </div>

            <div className="form-field">
              <label>Latitude *</label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({...formData, lat: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Longitude *</label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({...formData, lng: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Offense Type *</label>
              <input
                type="text"
                value={formData.offensetype}
                onChange={(e) => setFormData({...formData, offensetype: e.target.value})}
                required
              />
            </div>

            <div className="form-field">
              <label>Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({...formData, severity: e.target.value})}
                required
                className="form-select"
              >
                <option value="">Select Severity</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Minor">Minor</option>
              </select>
            </div>

            <div className="form-field">
              <label>Year *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                required
                min="2000"
                max="2099"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={closeModal} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              {modalMode === 'create' ? 'Create Record' : 'Update Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordModal;

