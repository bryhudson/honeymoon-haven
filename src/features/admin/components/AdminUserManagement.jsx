import React, { useState } from 'react';
import { PlusCircle, Users, CheckCircle, XCircle } from 'lucide-react';
import { formatNameForDisplay } from '../../../lib/shareholders';
import { UserActionsDropdown } from '../../dashboard/components/UserActionsDropdown';

export function AdminUserManagement({
    shareholders,
    editingShareholder,
    setEditingShareholder,
    handleUpdateShareholder,
    handlePasswordChange,
    handleDeleteUser,
    handleResetWelcomeBanner,
    setIsCreateUserModalOpen,
    IS_SITE_OWNER
}) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Users & Roles</h2>
                <div className="flex gap-2">
                    {IS_SITE_OWNER && (
                        <button
                            onClick={() => setIsCreateUserModalOpen(true)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Add Shareholder
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {shareholders.map((person) => (
                    <div key={person.id} className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">{formatNameForDisplay(person.name)}</h3>
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    Cabin #{person.cabin}
                                </span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${person.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {person.role === 'super_admin' ? 'Super Admin' : 'Shareholder'}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Email</div>
                            <div className="text-slate-700 font-medium break-all">{person.email}</div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-end">
                            <UserActionsDropdown
                                user={person}
                                onEdit={(u) => setEditingShareholder({ id: u.id, email: u.email })}
                                onPassword={handlePasswordChange}
                                onDelete={handleDeleteUser}
                                onResetBanner={handleResetWelcomeBanner}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 w-20">Cabin</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email(s)</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                            {shareholders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground italic">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : (
                                shareholders.map((person) => (
                                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-slate-400">#{person.cabin}</td>
                                        <td className="px-6 py-3 font-semibold text-slate-900">{formatNameForDisplay(person.name)}</td>
                                        <td className="px-6 py-3">
                                            {editingShareholder?.id === person.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingShareholder.email}
                                                        onChange={(e) => setEditingShareholder({ ...editingShareholder, email: e.target.value })}
                                                        className="flex-1 px-2 py-1 text-xs border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={handleUpdateShareholder}
                                                        className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingShareholder(null)}
                                                        className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">{person.email}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${person.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {person.role === 'super_admin' ? 'Super Admin' : 'Shareholder'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {editingShareholder?.id !== person.id && (
                                                <div className="flex justify-end pr-2">
                                                    <UserActionsDropdown
                                                        user={person}
                                                        onEdit={(u) => setEditingShareholder({ id: u.id, email: u.email })}
                                                        onPassword={handlePasswordChange}
                                                        onDelete={handleDeleteUser}
                                                        onResetBanner={handleResetWelcomeBanner}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
