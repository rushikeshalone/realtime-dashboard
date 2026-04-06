import React from 'react';

// ========================================================
// Toast Trigger Helper (Uses react-hot-toast)
// ========================================================
export function triggerToast(alert) {
    const icons = { SUCCESS: '✅', WARNING: '⚠️', INFO: 'ℹ️', ERROR: '❌', NOTICE: '📢', BIRTHDAY: '🎂' };

    // Dynamic import to avoid SSR issues if any, though not strictly needed here
    import('react-hot-toast').then(({ toast }) => {
        toast(alert.Message, {
            icon: icons[alert.AlertType] || '🔔',
            duration: 5000,
            style: {
                background: '#1f2937',
                color: '#f8fafc',
                border: '1px solid #374151',
            }
        });
    });
}

// ========================================================
// Alert Modal Component (For BIRTHDAY, URGENT MODALS)
// ========================================================
export function AlertModal({ alert, onClose }) {
    if (!alert) return null;

    const isBirthday = alert.AlertType === 'BIRTHDAY';

    return (
        <div style={styles.overlay}>
            <div style={{ ...styles.modal, borderColor: isBirthday ? '#ec4899' : '#3b82f6' }}>
                <div style={styles.modalHeader}>
                    <span style={styles.modalIcon}>{isBirthday ? '🎂' : '📢'}</span>
                    <h2 style={styles.modalTitle}>{alert.Title}</h2>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>
                <div style={styles.modalBody}>
                    <p style={styles.modalMessage}>{alert.Message}</p>
                    {isBirthday && <div style={styles.confetti}>🎉✨🎈🎊</div>}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={{ ...styles.actionBtn, background: isBirthday ? '#ec4899' : '#3b82f6' }}>
                        {isBirthday ? 'Yay! Thank You' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ========================================================
// Alert Banners Component (For NOTICE, INFO BANNERS)
// ========================================================
export function AlertBanners({ alerts, onDismiss }) {
    if (!alerts?.length) return null;
    const icons = { INFO: 'ℹ️', WARNING: '⚠️', SUCCESS: '✅', BIRTHDAY: '🎉', NOTICE: '📢' };

    return (
        <div className="alerts-container">
            {alerts.map((a) => (
                <div key={a.Dashboard_AlertConfiguration_AlertId} className={`alert-banner ${a.AlertType || 'INFO'}`}>
                    <span className="alert-icon">{icons[a.AlertType] || 'ℹ️'}</span>
                    <div className="alert-content">
                        <div className="alert-title">{a.Title}</div>
                        <div className="alert-msg">{a.Message}</div>
                    </div>
                    <button className="alert-close" onClick={() => onDismiss(a.Dashboard_AlertConfiguration_AlertId)}>×</button>
                </div>
            ))}
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)',
    },
    modal: {
        background: '#111827', border: '2px solid', borderRadius: 20,
        width: '90%', maxWidth: 500, padding: 30, textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'scaleUp 0.3s ease',
    },
    modalHeader: { marginBottom: 20, position: 'relative' },
    modalIcon: { fontSize: 50, display: 'block', marginBottom: 10 },
    modalTitle: { fontSize: 24, fontWeight: 800, color: '#f8fafc', margin: 0 },
    closeBtn: {
        position: 'absolute', top: -10, right: -10, background: 'transparent',
        border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer',
    },
    modalBody: { marginBottom: 24 },
    modalMessage: { fontSize: 16, color: '#cbd5e1', lineHeight: 1.6 },
    confetti: { fontSize: 30, marginTop: 15, animation: 'bounce 2s infinite' },
    modalFooter: { display: 'flex', justifyContent: 'center' },
    actionBtn: {
        border: 'none', borderRadius: 10, padding: '12px 30px', color: '#fff',
        fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'transform 0.2s',
    },
};
