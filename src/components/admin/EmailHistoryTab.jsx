import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Clock, CheckCircle, XCircle, Search, Mail, Filter, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../ConfirmationModal';

export function EmailHistoryTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'sent', 'failed'

    // Delete State
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, logId: null, subject: '', isBulk: false });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Initial fetch - get last 100 logs
            const logsRef = collection(db, "email_logs");
            const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
            const snapshot = await getDocs(q);

            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()
            }));
            setLogs(fetchedLogs);
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Selection Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLogs(filteredLogs.map(l => l.id));
        } else {
            setSelectedLogs([]);
        }
    };

    const handleSelectLog = (id) => {
        setSelectedLogs(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleDeleteClick = (log) => {
        setDeleteModal({
            isOpen: true,
            logId: log.id,
            subject: log.subject,
            isBulk: false
        });
    };

    const handleBulkDeleteMethods = () => {
        if (selectedLogs.length === 0) return;
        setDeleteModal({
            isOpen: true,
            logId: null,
            subject: `${selectedLogs.length} selected logs`,
            isBulk: true
        });
    };

    const confirmDelete = async () => {
        try {
            const batch = writeBatch(db); // Need writeBatch import

            if (deleteModal.isBulk) {
                // Bulk Delete
                // Firestore batch limit is 500, we limit fetch to 100 so safe.
                selectedLogs.forEach(id => {
                    const ref = doc(db, "email_logs", id);
                    batch.delete(ref);
                });
                await batch.commit();
                setLogs(prev => prev.filter(l => !selectedLogs.includes(l.id)));
                setSelectedLogs([]);
            } else {
                // Single Delete
                if (!deleteModal.logId) return;
                await deleteDoc(doc(db, "email_logs", deleteModal.logId));
                setLogs(prev => prev.filter(l => l.id !== deleteModal.logId));
            }

            setDeleteModal({ isOpen: false, logId: null, subject: '', isBulk: false });
        } catch (err) {
            console.error("Failed to delete log(s):", err);
            alert("Failed to delete: " + err.message);
        }
    };

    // Pre-process logs for easier filtering and rendering
    const processedLogs = logs.map(log => {
        let recipientName = log.to;
        let recipientEmail = log.to;
        let cabinNumber = log.cabinNumber || "-";

        try {
            if (log.original_to) {
                const parsed = JSON.parse(log.original_to);
                if (parsed.name) recipientName = parsed.name;
                if (parsed.email) recipientEmail = parsed.email;
                if (parsed.cabinNumber) cabinNumber = parsed.cabinNumber;
            }
        } catch (e) { }

        return {
            ...log,
            recipientName,
            recipientEmail,
            cabinNumber
        };
    });

    const filteredLogs = processedLogs.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            (log.recipientName && log.recipientName.toLowerCase().includes(searchLower)) ||
            (log.recipientEmail && log.recipientEmail.toLowerCase().includes(searchLower)) ||
            (log.cabinNumber && String(log.cabinNumber).toLowerCase().includes(searchLower)) ||
            (log.subject && log.subject.toLowerCase().includes(searchLower));

        const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusParams = (status) => {
        if (status === 'sent') return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, bg: 'bg-green-50', text: 'text-green-700' };
        if (status === 'failed') return { icon: <XCircle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50', text: 'text-red-700' };
        return { icon: <Clock className="w-4 h-4 text-slate-400" />, bg: 'bg-slate-50', text: 'text-slate-600' };
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="w-6 h-6 text-slate-700" />
                        Email History
                    </h2>
                    <p className="text-sm text-slate-500">View recent outgoing system emails</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, cabin, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedLogs.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 font-bold text-sm">
                            {selectedLogs.length} Selected
                        </div>
                        <p className="text-sm text-indigo-900">
                            Logs selected for deletion.
                        </p>
                    </div>
                    <button
                        onClick={handleBulkDeleteMethods}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-sm flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selection
                    </button>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    Loading logs...
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    No logs found matching your filters.
                </div>
            ) : (
                <>
                    {/* DESKTOP VIEW: Table */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 w-12">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={selectedLogs.length === filteredLogs.length && filteredLogs.length > 0}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-3 w-48">Timestamp</th>
                                        <th className="px-6 py-3 w-24">Status</th>
                                        <th className="px-6 py-3 w-24">Cabin #</th>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Subject</th>

                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log) => {
                                        const { icon, bg, text } = getStatusParams(log.status);
                                        return (
                                            <tr key={log.id} className={`hover:bg-slate-50 transition-colors group ${selectedLogs.includes(log.id) ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedLogs.includes(log.id)}
                                                        onChange={() => handleSelectLog(log.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {log.timestamp ? log.timestamp.toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>
                                                        {icon}
                                                        <span className="capitalize">{log.status}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 font-bold">
                                                    {log.cabinNumber}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 truncate max-w-[150px]" title={log.recipientName}>
                                                    {log.recipientName}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs truncate max-w-[200px]" title={log.recipientEmail}>
                                                    {log.recipientEmail}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 truncate max-w-[300px]" title={log.subject}>
                                                    {log.isTestMode && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded mr-2">TEST</span>}
                                                    {log.subject}
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE VIEW: Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredLogs.map((log) => {
                            const { icon, bg, text } = getStatusParams(log.status);
                            return (
                                <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                                    {/* Card Header: Subject & Status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="font-medium text-slate-900 text-sm line-clamp-2">
                                            {log.isTestMode && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded mr-1.5 align-middle">TEST</span>}
                                            {log.subject}
                                        </div>
                                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${text}`}>
                                            {icon}
                                            <span className="capitalize">{log.status}</span>
                                        </span>
                                    </div>

                                    {/* Card Details: Name | Cabin | Time */}
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <span className="font-bold text-slate-800">{log.recipientName}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>Cabin {log.cabinNumber}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>{log.timestamp ? log.timestamp.toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                        }) : 'N/A'}</span>
                                    </div>

                                    {/* Card Footer: Email & Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                                        <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                                            {log.recipientEmail}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteClick(log)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete Log"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={deleteModal.isBulk ? "Delete Multiple Logs?" : "Delete Email Log"}
                message={deleteModal.isBulk
                    ? `Are you sure you want to delete ${selectedLogs.length} logs? This cannot be undone.`
                    : `Are you sure you want to delete this log entry?\n\nSubject: "${deleteModal.subject}"\n\nThis cannot be undone.`}
                isDanger={true}
                confirmText={deleteModal.isBulk ? "Delete All" : "Delete Log"}
                requireTyping={false}
            />
        </div>
    );
}
