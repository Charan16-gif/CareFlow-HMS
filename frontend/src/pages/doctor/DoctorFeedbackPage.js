import React, { useState, useEffect, useCallback, useMemo } from 'react';
import doctorService from '../../services/doctorService';
import Pagination from '../../components/common/Pagination';
import {
  Star,
  Award,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  TrendingUp,
} from 'lucide-react';

const DoctorFeedbackPage = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getDoctorFeedback();
      setFeedbackList(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load patient feedback records. Please try again.';
      if (err.response?.data?.detail) msg = err.response.data.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Patient Feedback — CareFlow Doctor Portal';
    fetchFeedback();
  }, [fetchFeedback]);

  // Derived filtered list
  const filteredList = useMemo(() => {
    return feedbackList.filter((fb) => {
      const matchesSearch =
        !searchTerm ||
        (fb.patient_name && fb.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fb.appointment_id && fb.appointment_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fb.comments && fb.comments.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRating =
        ratingFilter === 'ALL' ||
        (ratingFilter === '5' && fb.doctor_rating === 5) ||
        (ratingFilter === '4' && fb.doctor_rating === 4) ||
        (ratingFilter === '3' && fb.doctor_rating === 3) ||
        (ratingFilter === 'LOW' && fb.doctor_rating <= 2);

      return matchesSearch && matchesRating;
    });
  }, [feedbackList, searchTerm, ratingFilter]);

  // Analytics Metrics
  const stats = useMemo(() => {
    if (feedbackList.length === 0) {
      return {
        total: 0,
        avgRating: 0.0,
        positiveCount: 0,
        satisfactionRate: 0,
      };
    }
    const total = feedbackList.length;
    const sumRating = feedbackList.reduce((acc, curr) => acc + (curr.doctor_rating || 0), 0);
    const avgRating = (sumRating / total).toFixed(1);
    const positiveCount = feedbackList.filter((f) => f.doctor_rating >= 4).length;
    const satisfiedCount = feedbackList.filter((f) => f.overall_satisfaction === 'SATISFIED').length;
    const satisfactionRate = Math.round((satisfiedCount / total) * 100);

    return { total, avgRating, positiveCount, satisfactionRate };
  }, [feedbackList]);

  const renderStars = (count) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = count >= i;
      stars.push(
        <Star
          key={i}
          size={15}
          fill={filled ? '#fbbf24' : 'transparent'}
          stroke={filled ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
        />
      );
    }
    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>{stars}</div>;
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Patient Consultation Feedback</h2>
          <p className="admin-page-subtitle">
            Review verified patient feedback, consultation satisfaction, and ratings from completed visits
          </p>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              AVERAGE RATING
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(251, 191, 36, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Star size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
              {stats.avgRating}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)' }}>/ 5.0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
            {renderStars(Math.round(stats.avgRating))}
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              TOTAL REVIEWS
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-cyan, #06b6d4)',
              }}
            >
              <Award size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
            Verified post-consultation reviews
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              POSITIVE REVIEWS
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <ThumbsUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
            {stats.positiveCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.35rem' }}>
            Rated 4 or 5 stars
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              SATISFACTION RATE
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
            {stats.satisfactionRate}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
            Satisfied patient consultations
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="admin-table-controls" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient name, appointment ID, or comment..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search feedback records"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <Filter size={15} className="admin-text-dim" />
          <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Rating:</span>
          <select
            className="admin-input"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter feedback by rating"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars Only</option>
            <option value="LOW">1-2 Stars</option>
          </select>
          <span className="admin-table-record-count">
            {filteredList.length} {filteredList.length === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving feedback records...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Feedback</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchFeedback}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredList.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <MessageSquare size={32} />
          </div>
          <h3>No Feedback Found</h3>
          <p>
            {feedbackList.length === 0
              ? 'No patient feedback has been submitted for your consultations yet.'
              : 'No feedback matching the selected filter criteria.'}
          </p>
        </div>
      )}

      {/* Feedback Table */}
      {!loading && !error && filteredList.length > 0 && (
        <>
          <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Appointment</th>
                      <th>Patient</th>
                      <th>Rating</th>
                      <th>Experience</th>
                      <th>Communication</th>
                      <th>Satisfaction</th>
                      <th>Patient Remarks</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((fb) => (
                        <tr key={fb.id}>
                          <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                            {fb.appointment_id || `#${fb.appointment}`}
                          </td>
                          <td className="font-semibold">
                            {fb.patient_name || 'Patient'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {renderStars(fb.doctor_rating)}
                              <span className="admin-font-mono font-semibold" style={{ fontSize: '0.85rem' }}>
                                {fb.doctor_rating}/5
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="admin-badge"
                              style={{
                                background: 'rgba(6, 182, 212, 0.12)',
                                color: 'var(--primary-cyan, #06b6d4)',
                                fontWeight: 600,
                              }}
                            >
                              {fb.consultation_experience}
                            </span>
                          </td>
                          <td>
                            <span className="admin-badge admin-badge-teal">
                              {fb.doctor_communication}
                            </span>
                          </td>
                          <td>
                            <span
                              className="admin-badge"
                              style={{
                                background:
                                  fb.overall_satisfaction === 'SATISFIED'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : fb.overall_satisfaction === 'NEUTRAL'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  fb.overall_satisfaction === 'SATISFIED'
                                    ? '#10b981'
                                    : fb.overall_satisfaction === 'NEUTRAL'
                                      ? '#f59e0b'
                                      : '#ef4444',
                              }}
                            >
                              {fb.overall_satisfaction}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            {fb.comments ? (
                              <span
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  fontSize: '0.85rem',
                                  color: 'var(--admin-text-main)',
                                }}
                                title={fb.comments}
                              >
                                "{fb.comments}"
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-dim)' }}>
                                No written comments provided
                              </span>
                            )}
                          </td>
                          <td className="admin-font-mono" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                            {fb.created_at ? fb.created_at.slice(0, 10) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredList.length / pageSize)}
                totalCount={filteredList.length}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </div>
  );
};

export default DoctorFeedbackPage;

