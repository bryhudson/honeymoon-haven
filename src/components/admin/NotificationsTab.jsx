import React, { useState, useEffect } from 'react';
import { TEMPLATE_DEFINITIONS } from '../../services/emailTemplateDefinitions';
import { emailTemplates } from '../../services/emailTemplates';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Mail, RefreshCw, Undo, Save, Info } from 'lucide-react';

export function NotificationsTab({ triggerAlert, triggerConfirm }) {
    const [templates, setTemplates] = useState({});
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', body: '' });
    const [activeTab, setActiveTab] = useState('active'); // active vs available

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

    const generateDefaultContent = (id) => {
        // Attempt to reverse-engineer the default template
        // by passing {{key}} placeholders as data
        const def = TEMPLATE_DEFINITIONS.find(d => d.id === id);
        if (!def) return { subject: "", body: "" };

        const mockData = {};
        def.variables.forEach(v => {
            mockData[v] = `{{${v}}}`;
        });

        // Specific mocks for logic branches
        if (id === 'reminder') mockData.type = 'morning';
        if (id === 'bookingCancelled') mockData.within_turn_window = true;

        try {
            const { subject, htmlContent } = emailTemplates[id](mockData);
            // htmlContent is the FULL HTML. We only want the BODY (inner content).
            // But wrapHtml puts it inside ...
            // Wait, wrapping is done inside emailTemplates functions.
            // We need to extract the inner content if possible, or allow full HTML editing?
            // "wrapHtml(subject, body)"
            // The template functions return wrapHtml(...) result.
            // We can't cleanly extract body.

            // ALTERNATIVE: Just assume the user will rewrite it, 
            // OR regex match the body content?
            // The body is inside <div style="${BASE_STYLES}"> ... </div>
            // This is brittle.

            // Let's just output it as guidance.
            return { subject, body: "Default code content (complex to extract). Please rewrite or reference the existing emails." };
        } catch (e) {
            return { subject: "", body: "" };
        }
    };

    const handleEdit = (id) => {
        const existing = templates[id];
        if (existing) {
            setEditForm({ ...existing });
        } else {
            // New Override
            // Try to generate meaningful defaults?
            // Actually, we can't easily extract the BODY from the formatted HTML returned by emailTemplates.
            // So we will leave Body empty but show a tip.
            const defaults = generateDefaultContent(id);
            setEditForm({ subject: defaults.subject, body: "" });
        }
        setEditingId(id);
    };

    const handleSave = async () => {
        if (!editingId) return;
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
        setEditForm(prev => ({
            ...prev,
            body: prev.body + `{{${v}}}`
        }));
    };

    const currentDef = TEMPLATE_DEFINITIONS.find(d => d.id === editingId);

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
                            <label className="block text-sm font-medium">Body Content (HTML allowed)</label>
                            <span className="text-xs text-slate-400">Wrappers (Header/Footer) are added automatically.</span>
                        </div>
                        <textarea
                            className="w-full h-64 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
                            value={editForm.body}
                            onChange={e => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                            placeholder="<p>Hi {{name}},</p>..."
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Available Variables</label>
                        <div className="flex flex-wrap gap-2">
                            {currentDef?.variables.map(v => (
                                <button
                                    key={v}
                                    onClick={() => insertVar(v)}
                                    className="px-2 py-1 bg-white border rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors font-mono"
                                >
                                    {`{{${v}}}`}
                                </button>
                            ))}
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
