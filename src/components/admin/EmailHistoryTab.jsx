import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Clock, CheckCircle, XCircle, Search, Mail, Filter, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../ConfirmationModal';

export function EmailHistoryTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'sent', 'failed'

    // Delete State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, logId: null, subject: '' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Initial fetch - get last 100 logs
            // Ideally we'd implement pagination, but 100 is good for recent history
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

    const handleDeleteClick = (log) => {
        setDeleteModal({
            isOpen: true,
            logId: log.id,
            subject: log.subject
        });
    };

    const confirmDelete = async () => {
        if (!deleteModal.logId) return;

        try {
            await deleteDoc(doc(db, "email_logs", deleteModal.logId));

            // Optimistic update
            setLogs(prev => prev.filter(l => l.id !== deleteModal.logId));

            setDeleteModal({ isOpen: false, logId: null, subject: '' });
        } catch (err) {
            console.error("Failed to delete log:", err);
            alert("Failed to delete log: " + err.message);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.to && log.to.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.subject && log.subject.toLowerCase().includes(searchTerm.toLowerCase()));

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

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search email or subject..."
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

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 w-48">Timestamp</th>
                                <th className="px-6 py-3 w-24">Status</th>
                                <th className="px-6 py-3">To</th>
                                <th className="px-6 py-3">Subject</th>
                                <th className="px-6 py-3 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No logs found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const { icon, bg, text } = getStatusParams(log.status);

                                    // Format recipient nicely if it's an object string or simple string
                                    let recipientDisplay = log.to;
                                    try {
                                        // If stored as JSON string from the backend update
                                        if (log.original_to) {
                                            const parsed = JSON.parse(log.original_to);
                                            if (parsed.name && parsed.email) {
                                                recipientDisplay = `${parsed.name} <${parsed.email}>`;
                                            }
                                        }
                                    } catch (e) { }

                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                {log.timestamp ? log.timestamp.toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>
                                                    {icon}
                                                    <span className="capitalize">{log.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-[200px]" title={recipientDisplay}>
                                                {recipientDisplay}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 truncate max-w-[300px]" title={log.subject}>
                                                {log.isTestMode && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded mr-2">TEST</span>}
                                                {log.subject}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteClick(log)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Delete Email Log"
                message={`Are you sure you want to delete this log entry?\n\nSubject: "${deleteModal.subject}"\n\nThis cannot be undone.`}
                isDanger={true}
                confirmText="Delete Log"
                requireTyping="delete"
            />
        </div>
    );
}
