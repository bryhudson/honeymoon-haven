import React, { useState, useEffect } from 'react';
import { TEMPLATE_DEFINITIONS } from '../../services/emailTemplateDefinitions';
import { emailTemplates } from '../../services/emailTemplates';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Mail, RefreshCw, Undo, Save, Info } from 'lucide-react';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export function NotificationsTab({ triggerAlert, triggerConfirm, currentUser, requireAuth }) {
    const [templates, setTemplates] = useState({});
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', body: '' });
    const [isHtmlMode, setIsHtmlMode] = useState(false); // Toggle between Visual (False) and Code (True)

    // Fetch existing overrides
    const fetchTemplates = async () => {
        setLoading(true);
        const temp = {};
        for (const def of TEMPLATE_DEFINITIONS) {
            try {
                const snap = await getDoc(doc(db, "email_templates", def.id));
                if (snap.exists()) {
                    temp[def.id] = snap.data();
                }
            } catch (err) {
                console.error("Fetch err", err);
            }
        }
        setTemplates(temp);
        setLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleEdit = (id) => {
        const existing = templates[id];
        const def = TEMPLATE_DEFINITIONS.find(d => d.id === id);

        if (existing) {
            setEditForm({ ...existing });
        } else {
            // New Override: Pre-fill with default context
            setEditForm({
                subject: def?.defaultSubject || "",
                body: def?.defaultBody?.trim() || ""
            });
        }
        setEditingId(id);
        setIsHtmlMode(false); // Default to visual mode
    };

    const handleSave = async () => {
        if (!editingId) return;

        // Security Check: Whitelist Logic
        const ALLOWED_EMAIL = "bryan.m.hudson@gmail.com";
        if (currentUser?.email !== ALLOWED_EMAIL) {
            return triggerAlert("Access Denied", "Only the primary admin (bryan.m.hudson@gmail.com) can modify email templates.");
        }

        // Require Password Re-authentication
        requireAuth(
            "Protected Action",
            "Modifying system email templates requires password verification.",
            async () => {
                try {
                    await setDoc(doc(db, "email_templates", editingId), {
                        id: editingId,
                        subject: editForm.subject,
                        body: editForm.body,
                        updatedAt: new Date()
                    });
                    triggerAlert("Success", "Template saved.");
                    setEditingId(null);
                    fetchTemplates();
                } catch (err) {
                    triggerAlert("Error", err.message);
                }
            }
        );
    };

    const handleReset = () => {
        triggerConfirm("Reset to Default?", "This will delete your custom template and revert to the hardcoded system default.", async () => {
            try {
                await deleteDoc(doc(db, "email_templates", editingId));
                triggerAlert("Success", "Reverted to default.");
                setEditingId(null);
                fetchTemplates();
            } catch (err) {
                triggerAlert("Error", err.message);
            }
        }, true);
    };

    const insertVar = (v) => {
        // For Quill, we might need a different insertion method if using ref, but appending to string works for state
        // However, if using WYSIWYG, we need to insert at cursor.
        // For now, simplified: append to end if in Code mode, or just copy to clipboard? 
        // Let's just append or update state for now.
        setEditForm(prev => ({
            ...prev,
            body: prev.body + `{{${v}}}`
        }));
    };

    const currentDef = TEMPLATE_DEFINITIONS.find(d => d.id === editingId);

    // Generate Preview Content
    const getPreviewContent = () => {
        let content = editForm.body;
        // Replace known variables with dummy data for preview
        const dummyData = {
            name: "John Doe",
            deadline_date: "Oct 15, 2026",
            deadline_time: "5:00 PM",
            booking_url: "#",
            dashboard_url: "#",
            pass_turn_url: "#",
            current_phase_title: "Round 1",
            current_phase_detail: "Pick 1-12",
            email: "john@example.com",
            role: "Shareholder",
            temp_password: "secure-password-123"
        };

        // Simple replace for preview
        Object.keys(dummyData).forEach(key => {
            content = content.replaceAll(`{{${key}}}`, `<span class="bg-yellow-100 text-yellow-800 px-1 rounded">${dummyData[key]}</span>`);
        });

        // Handle unknown variables
        content = content.replace(/{{(.*?)}}/g, '<span class="bg-red-100 text-red-800 px-1 rounded">{{$1}}</span>');

        return { __html: content };
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    if (editingId) {
        return (
            <div className="bg-card border rounded-lg p-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Edit: {currentDef?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{currentDef?.description}</p>
                    </div>
                    <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Subject Line</label>
                        <input
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editForm.subject}
                            onChange={e => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Enter email subject..."
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Body Content</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Editor Mode:</span>
                                <button
                                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                                    className="text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                                >
                                    {isHtmlMode ? "Switch to Visual Editor" : "Switch to Code Editor"}
                                </button>
                            </div>
                        </div>

                        {isHtmlMode ? (
                            <textarea
                                className="w-full h-64 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
                                value={editForm.body}
                                onChange={e => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="<p>Hi {{name}},</p>..."
                            />
                        ) : (
                            <div className="h-80 mb-12">
                                <ReactQuill
                                    theme="snow"
                                    value={editForm.body}
                                    onChange={(content) => setEditForm(prev => ({ ...prev, body: content }))}
                                    className="h-64"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'clean']
                                        ]
                                    }}
                                />
                            </div>
                        )}
                        {!isHtmlMode && <p className="text-xs text-amber-600 mt-2">Note: Complex layouts (cards, buttons) may be simplified by the Visual Editor. Switch to Code Editor for full control.</p>}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Available Variables (Click to Copy)</label>
                        <div className="flex flex-wrap gap-2">
                            {currentDef?.variables.map(v => (
                                <button
                                    key={v}
                                    onClick={() => {
                                        navigator.clipboard.writeText(`{{${v}}}`);
                                        triggerAlert("Copied", `{{${v}}} copied to clipboard`);
                                    }}
                                    className="px-2 py-1 bg-white border rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors font-mono"
                                >
                                    {`{{${v}}}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden mt-6">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Live Preview</span>
                            <span className="text-[10px] text-slate-400">Values are examples</span>
                        </div>
                        <div className="p-6 bg-white prose prose-sm max-w-none">
                            {/* Simulate Email Wrapper */}
                            <div style={{ fontFamily: 'sans-serif', lineHeight: '1.6', color: '#1a202c' }}>
                                <div dangerouslySetInnerHTML={getPreviewContent()} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
                        >
                            <Undo className="w-4 h-4" /> Reset to Default
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm transition-all font-bold"
                        >
                            <Save className="w-4 h-4" /> Save Template
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-100">
                <Info className="w-5 h-5 shrink-0" />
                <p className="text-sm">
                    Customize the email notifications sent to shareholders.
                    <strong>Templates saved here override the system defaults.</strong>
                    You can reset them at any time.
                </p>
            </div>

            {/* Manual Test Email Section */}
            <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">📧 Manual Test Emails</h3>
                        <p className="text-sm text-slate-500">Send test emails to verify notifications (redirects to your email in test mode)</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'turnStarted' });
                                triggerAlert("Test Email Sent", "Turn Started email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Turn Start
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'reminder' });
                                triggerAlert("Test Email Sent", "Reminder email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Reminder
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'finalWarning' });
                                triggerAlert("Test Email Sent", "Urgent warning email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border-2 border-orange-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Urgent
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'bonusTime' });
                                triggerAlert("Test Email Sent", "Bonus Time email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-purple-300 rounded-lg font-bold text-sm transition-all"
                    >
                        🎁 Bonus Time
                    </button>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                    ⚠️ Emails send to active picker or bryan.m.hudson@gmail.com if no active turn
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {TEMPLATE_DEFINITIONS.map(def => {
                    const isCustomized = !!templates[def.id];
                    return (
                        <div key={def.id} className="flex items-start justify-between p-4 bg-white border rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-full ${isCustomized ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{def.name}</h4>
                                    <p className="text-sm text-slate-500">{def.description}</p>
                                    {isCustomized && (
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded">
                                            Customized
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleEdit(def.id)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border rounded-md transition-colors"
                            >
                                {isCustomized ? 'Edit' : 'Customize'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
