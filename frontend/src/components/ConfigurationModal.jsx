import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchConfigurations, updateConfigurations } from '../api.js';

export default function ConfigurationModal({ isOpen, onClose, onSaved }) {
    const [allConfigs, setAllConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedCard, setSelectedCard] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadConfigs();
            setSelectedCard('');
        }
    }, [isOpen]);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await fetchConfigurations();
            setAllConfigs(data);
        } catch (err) {
            toast.error('Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    // Get unique card names from configs
    const cardNames = [...new Set(allConfigs.map(c => c.CardName))];

    // Get table name for selected card (auto-fill)
    const selectedTableName = selectedCard
        ? (allConfigs.find(c => c.CardName === selectedCard)?.TableName || '')
        : '';

    // Get columns for selected card, sorted by Sequence
    const cardColumns = allConfigs
        .filter(c => c.CardName === selectedCard)
        .sort((a, b) => a.Sequence - b.Sequence);

    const toggleDisplay = (columnName) => {
        setAllConfigs(prev => prev.map(c =>
            c.CardName === selectedCard && c.ColumnName === columnName
                ? { ...c, IsDisplay: c.IsDisplay ? 0 : 1 }
                : c
        ));
    };

    const updateDisplayName = (columnName, value) => {
        setAllConfigs(prev => prev.map(c =>
            c.CardName === selectedCard && c.ColumnName === columnName
                ? { ...c, DisplayName: value }
                : c
        ));
    };

    const moveRow = (columnName, direction) => {
        const cols = allConfigs
            .filter(c => c.CardName === selectedCard)
            .sort((a, b) => a.Sequence - b.Sequence);
        const idx = cols.findIndex(c => c.ColumnName === columnName);
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= cols.length) return;

        const seqA = cols[idx].Sequence;
        const seqB = cols[swapIdx].Sequence;

        setAllConfigs(prev => prev.map(c => {
            if (c.CardName === selectedCard && c.ColumnName === cols[idx].ColumnName) return { ...c, Sequence: seqB };
            if (c.CardName === selectedCard && c.ColumnName === cols[swapIdx].ColumnName) return { ...c, Sequence: seqA };
            return c;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const toSave = selectedCard ? allConfigs.filter(c => c.CardName === selectedCard) : allConfigs;
            await updateConfigurations(toSave);
            toast.success('Configuration saved!');
            if (onSaved) onSaved();
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⚙️</span>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Dashboard Configuration</span>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>

                {/* Dropdowns Row */}
                <div style={styles.dropdownRow}>
                    <div style={styles.dropdownGroup}>
                        <label style={styles.label}>Card Name</label>
                        <select
                            value={selectedCard}
                            onChange={e => setSelectedCard(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">Select Card</option>
                            {cardNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.dropdownGroup}>
                        <label style={styles.label}>Table Name</label>
                        <select disabled style={{ ...styles.select, opacity: 0.6, cursor: 'not-allowed' }}>
                            <option>{selectedTableName || 'Auto-selected'}</option>
                        </select>
                    </div>
                </div>

                {/* Column Table */}
                <div style={styles.body}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</div>
                    ) : !selectedCard ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 }}>
                            👆 Select a card to configure its columns
                        </div>
                    ) : cardColumns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No columns found</div>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Column Name</th>
                                    <th style={styles.th}>Display Name</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Visible</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cardColumns.map((col, i) => (
                                    <tr key={col.ColumnName} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={styles.td}>{col.ColumnName}</td>
                                        <td style={styles.td}>
                                            <input
                                                type="text"
                                                value={col.DisplayName || ''}
                                                onChange={e => updateDisplayName(col.ColumnName, e.target.value)}
                                                style={styles.input}
                                            />
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <label style={styles.toggle}>
                                                <input
                                                    type="checkbox"
                                                    checked={col.IsDisplay === 1}
                                                    onChange={() => toggleDisplay(col.ColumnName)}
                                                    style={{ display: 'none' }}
                                                />
                                                <span style={{
                                                    ...styles.toggleSlider,
                                                    background: col.IsDisplay === 1 ? '#3b82f6' : '#374151',
                                                }}>
                                                    <span style={{
                                                        ...styles.toggleThumb,
                                                        transform: col.IsDisplay === 1 ? 'translateX(20px)' : 'translateX(2px)',
                                                    }} />
                                                </span>
                                            </label>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <button onClick={() => moveRow(col.ColumnName, -1)} disabled={i === 0} style={{ ...styles.orderBtn, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                                            <button onClick={() => moveRow(col.ColumnName, 1)} disabled={i === cardColumns.length - 1} style={{ ...styles.orderBtn, marginLeft: 4, opacity: i === cardColumns.length - 1 ? 0.3 : 1 }}>↓</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                        {saving ? 'Saving...' : '💾 Update Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)',
    },
    modal: {
        background: '#111827', border: '1px solid #1f2937', borderRadius: 12,
        width: '90%', maxWidth: 800, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', color: '#f8fafc',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 24px', borderBottom: '1px solid #1f2937',
    },
    closeBtn: {
        background: 'transparent', border: 'none', fontSize: 26,
        cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: '0 4px',
    },
    dropdownRow: {
        display: 'flex', gap: 20, padding: '20px 24px', borderBottom: '1px solid #1f2937',
    },
    dropdownGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
    select: {
        background: '#0f172a', border: '1px solid #3b82f6', borderRadius: 6,
        padding: '9px 12px', color: '#f8fafc', fontSize: 14, outline: 'none', cursor: 'pointer',
    },
    body: { flex: 1, overflowY: 'auto', padding: '16px 24px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        padding: '10px 12px', textAlign: 'left', fontSize: 12,
        color: '#64748b', borderBottom: '1px solid #1f2937', fontWeight: 600, textTransform: 'uppercase',
    },
    td: { padding: '10px 12px', fontSize: 14, color: '#cbd5e1' },
    input: {
        background: '#0f172a', border: '1px solid #374151', borderRadius: 5,
        padding: '6px 10px', color: '#f8fafc', fontSize: 13, width: '100%',
        outline: 'none', boxSizing: 'border-box',
    },
    toggle: { cursor: 'pointer', display: 'inline-block' },
    toggleSlider: {
        display: 'inline-flex', alignItems: 'center', width: 44, height: 24,
        borderRadius: 12, transition: 'background 0.2s', position: 'relative',
    },
    toggleThumb: {
        width: 20, height: 20, background: '#fff', borderRadius: '50%',
        transition: 'transform 0.2s', position: 'absolute',
    },
    orderBtn: {
        background: '#1e293b', border: '1px solid #374151', borderRadius: 4,
        padding: '4px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
    },
    footer: {
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        padding: '16px 24px', borderTop: '1px solid #1f2937',
    },
    cancelBtn: {
        background: 'transparent', border: '1px solid #374151', borderRadius: 6,
        padding: '8px 20px', color: '#94a3b8', cursor: 'pointer', fontWeight: 500,
    },
    saveBtn: {
        background: '#3b82f6', border: 'none', borderRadius: 6,
        padding: '8px 24px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
    },
};
