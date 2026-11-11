import React, { useState, useEffect, useCallback, useMemo } from 'react';
import adminService from '../../services/adminService';
import Pagination from '../../components/common/Pagination';
import {
  Star,
  Award,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
  Loader2,
  TrendingUp,
  Search,
  Filter,
  BarChart2,
} from 'lucide-react';

const AdminFeedbackPage = () => {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'all'
  const [analytics, setAnalytics] = useState(null);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter for All Feedback tab
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ratingFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, feedbackData] = await Promise.all([
        adminService.getFeedbackAnalytics(),
        adminService.getAllFeedback(),
      ]);
      setAnalytics(analyticsData);
      setAllFeedback(Array.isArray(feedbackData) ? feedbackData : feedbackData?.results || []);
    } catch (err) {
      let msg = 'Failed to load feedback analytics. Please try again.';
      if (err.response?.data?.detail) msg = err.response.data.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Feedback Analytics — CareFlow Admin';
    fetchData();
  }, [fetchData]);

  const filteredFeedback = useMemo(() => {
    return allFeedback.filter((fb) => {
      const matchesSearch =
        !searchTerm ||
        (fb.patient_name && fb.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fb.doctor_name && fb.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
  }, [allFeedback, searchTerm, ratingFilter]);

  const renderStars = (count) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = count >= i;
      stars.push(
        <Star
          key={i}
          size={14}
          fill={filled ? '#fbbf24' : 'transparent'}
          stroke={filled ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
        />
      );
    }
    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>{stars}</div>;
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Patient Feedback & Satisfaction Analytics</h2>
          <p className="admin-page-subtitle">
            Hospital-wide consultation ratings, quality metrics, and doctor performance insights
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={16} />
            <span>Hospital Analytics Overview</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <MessageSquare size={16} />
            <span>All Feedback Records ({allFeedback.length})</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Calculating hospital quality metrics...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Analytics</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchData}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Analytics Content */}
      {!loading && !error && (
        <>
          {activeTab === 'analytics' && analytics && (
            <div>
              {/* Stat Metric Cards */}
              <div className="admin-feedback-stats-grid">
                <div className="admin-card admin-feedback-stat-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                      TOTAL REVIEWS
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-cyan, #06b6d4)' }}>
                      <Award size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                    {analytics.total_feedbacks}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
                    Verified patient consultations
                  </div>
                </div>

                <div className="admin-card admin-feedback-stat-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                      HOSPITAL AVG RATING
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                      <Star size={16} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                      {analytics.average_doctor_rating}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)' }}>/ 5.0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                    {renderStars(Math.round(analytics.average_doctor_rating))}
                  </div>
                </div>

                <div className="admin-card admin-feedback-stat-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                      OVERALL SATISFACTION
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                    {analytics.satisfaction_percentage}%
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.35rem' }}>
                    Patients marked Satisfied
                  </div>
                </div>

                <div className="admin-card admin-feedback-stat-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                      REVIEW SENTIMENT
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                      <ThumbsUp size={16} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto' }}>
                    <span className="admin-badge admin-badge-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{analytics.positive_count} Positive</span>
                    <span className="admin-badge admin-badge-warning" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{analytics.neutral_count} Neutral</span>
                    <span className="admin-badge admin-badge-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{analytics.negative_count} Low</span>
                  </div>
                </div>
              </div>

              {/* Quality Breakdown Bars */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  gap: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Consultation Experience Breakdown */}
                <div className="admin-card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--admin-text-main)' }}>
                    Consultation Experience
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(analytics.experience_breakdown || {}).map(([level, count]) => {
                      const total = analytics.total_feedbacks || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={level}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{level}</span>
                            <span style={{ color: 'var(--admin-text-muted)' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background:
                                  level === 'EXCELLENT'
                                    ? '#10b981'
                                    : level === 'GOOD'
                                      ? '#06b6d4'
                                      : level === 'AVERAGE'
                                        ? '#f59e0b'
                                        : '#ef4444',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Doctor Communication Breakdown */}
                <div className="admin-card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--admin-text-main)' }}>
                    Doctor Communication
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(analytics.communication_breakdown || {}).map(([level, count]) => {
                      const total = analytics.total_feedbacks || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={level}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{level}</span>
                            <span style={{ color: 'var(--admin-text-muted)' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background:
                                  level === 'EXCELLENT'
                                    ? '#10b981'
                                    : level === 'GOOD'
                                      ? '#06b6d4'
                                      : '#ef4444',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Doctor-wise Performance Table */}
              <div className="admin-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--admin-text-main)' }}>
                  Physician Performance Breakdown
                </h3>

                {analytics.doctor_summaries?.length === 0 ? (
                  <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.88rem' }}>
                    No doctor feedback summaries available yet.
                  </p>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Doctor ID</th>
                          <th>Physician</th>
                          <th>Specialization</th>
                          <th>Total Reviews</th>
                          <th>Average Rating</th>
                          <th>Positive Reviews</th>
                          <th>Negative Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.doctor_summaries?.map((doc) => (
                          <tr key={doc.doctor_id || doc.doctor_name}>
                            <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                              {doc.doctor_id}
                            </td>
                            <td className="font-semibold">{doc.doctor_name}</td>
                            <td>
                              <span style={{ color: 'var(--admin-text-muted)' }}>
                                {doc.specialization}
                              </span>
                            </td>
                            <td className="font-semibold">{doc.total_reviews}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {renderStars(Math.round(doc.avg_rating))}
                                <span className="admin-font-mono font-semibold">
                                  {doc.avg_rating}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-success">
                                {doc.positive_reviews}
                              </span>
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-danger">
                                {doc.negative_reviews}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ALL FEEDBACK RECORDS */}
          {activeTab === 'all' && (
            <div>
              {/* Filter and Search Bar Controls */}
              <div className="admin-table-controls" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="admin-search-wrapper">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search doctor, patient, appointment ID, or comment..."
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
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="LOW">1-2 Stars</option>
                  </select>
                  <span className="admin-table-record-count">
                    {filteredFeedback.length} {filteredFeedback.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
              </div>

              {filteredFeedback.length === 0 ? (
                <div className="admin-empty-table-card">
                  <div className="admin-empty-icon-box">
                    <MessageSquare size={32} />
                  </div>
                  <h3>No Feedback Found</h3>
                  <p>No feedback matching the selected filter criteria.</p>
                </div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Appointment</th>
                          <th>Doctor</th>
                          <th>Patient</th>
                          <th>Rating</th>
                          <th>Experience</th>
                          <th>Satisfaction</th>
                          <th>Remarks</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFeedback
                          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                          .map((fb) => (
                            <tr key={fb.id}>
                              <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                                {fb.appointment_id || `#${fb.appointment}`}
                              </td>
                              <td className="font-semibold">
                                <div>Dr. {fb.doctor_name}</div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                                  {fb.doctor_specialization}
                                </span>
                              </td>
                              <td>{fb.patient_name}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {renderStars(fb.doctor_rating)}
                                  <span className="admin-font-mono font-semibold">
                                    {fb.doctor_rating}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="admin-badge admin-badge-teal">
                                  {fb.consultation_experience}
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
                                      fontSize: '0.82rem',
                                    }}
                                    title={fb.comments}
                                  >
                                    "{fb.comments}"
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-dim)' }}>
                                    No comment
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
                    totalPages={Math.ceil(filteredFeedback.length / pageSize)}
                    totalCount={filteredFeedback.length}
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
          )}
        </>
      )}
    </div>
  );
};

export default AdminFeedbackPage;
